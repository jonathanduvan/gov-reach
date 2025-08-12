import express, { Request, Response } from "express";
import OfficialSubmission from "../models/OfficialSubmission.js";
import OfficialModel from "../models/Official.js";
import mongoose from "mongoose";
import { requireAdminOrPartner, requireAuth } from "../middleware/auth.js";
import { validateAndNormalizeSubmission } from "../middleware/validateSubmission.js";
import { matchOfficial } from "../middleware/officialMatch.js";
import { ensureIssuesByNames } from "../services/issueService.js";
import { buildMergedOfficial, saveOfficialFromMerge } from "../services/mergeOfficial.js";
import ThreadLock from "../models/ThreadLock.js";
import { logReviewEvent } from "../services/audit.js";
import { emitEvent } from "../services/events.js";

const router = express.Router();

const LOCK_TTL_MIN = Number(process.env.REVIEW_LOCK_TTL_MINUTES || 30);
const isExpired = (d: Date) => !d || d.getTime() < Date.now() - LOCK_TTL_MIN * 60 * 1000;


// Create a new submission (create or edit)
router.post("/", requireAuth, validateAndNormalizeSubmission, async (req: Request, res: Response) => {
  try {
    const {
      proposed,
      submitterId,
      submitterEmail,
      submitterRole,
    } = req.body;
    var {type, targetOfficialId = null} = req.body;

    if (!type || !proposed || !submitterId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

     // Classify
    const m = await matchOfficial({
      email: proposed.email,
      fullName: proposed.fullName,
      role: proposed.role,
      state: proposed.state,
      level: proposed.level,
      jurisdiction: proposed.jurisdiction,
    });

    if (m.method === "email" || (m.method === "fuzzy" && m.score >= 0.88)) {
      type = "edit";
      targetOfficialId = m.officialId;
    } else if (m.method === "none" && m.score >= 0.75) {
      // soft match -> mark as conflict to force reviewer decision
      req.body.status = "conflict";
    }

    const submission = await OfficialSubmission.create({
      type,
      targetOfficialId,
      proposed,
      submitterId,
      submitterEmail,
      submitterRole,
      status: req.body.status || "pending",
      dedupe: {
        method: m.method,
        score: m.score,
        candidates: m.candidates,
        reason: m.reason,
      },
      sourceAttribution: { originalRaw: req.body },
    });

    res.status(201).json(submission);
  } catch (err) {
    console.error("Error creating submission:", err);
    res.status(500).json({ message: "Failed to create submission" });
  }
});

// List submissions (filterable)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, issue, city, state, submitterId } = req.query as Record<string, string>;
    const filter: any = {};

    if (status) filter.status = status;
    if (submitterId) filter.submitterId = submitterId;

    // optional: filter by issue or jurisdiction inside proposed
    if (issue) {
      filter["proposed.issues"] = { $in: [issue] }; // assumes issue is issue-id string
    }
    if (city) {
      filter["proposed.jurisdiction.city"] = { $regex: new RegExp(`^${city}$`, "i") };
    }
    if (state) {
      filter["proposed.state"] = state.toUpperCase();
    }

    const subs = await OfficialSubmission.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(subs);
  } catch (err) {
    console.error("Error listing submissions:", err);
    res.status(500).json({ message: "Failed to list submissions" });
  }
});

// Get all submissions related to a canonical official
router.get("/official/:officialId", async (req: Request, res: Response) => {
  try {
    const { officialId } = req.params;
    if (!mongoose.isValidObjectId(officialId)) {
      return res.status(400).json({ message: "Invalid officialId" });
    }
    const subs = await OfficialSubmission.find({
      $or: [{ targetOfficialId: officialId }, { "proposed._id": officialId }],
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(subs);
  } catch (err) {
    console.error("Error fetching official submissions:", err);
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
});

// Vote on a submission
router.post("/:id/vote", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, userId } = req.body as { type: "up" | "down"; userId: string };
    if (!["up", "down"].includes(type)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }
    const sub = await OfficialSubmission.findById(req.params.id).lean();
    if (!sub) return res.status(404).json({ message: "Submission not found" });

    // enforce lock if thread exists (groupKey present) and not expired
    if (sub.groupKey) {
      const lock = await ThreadLock.findOne({ groupKey: sub.groupKey });
      const meEmail = req.session.user!.email!;
      const meRole  = req.session.user!.role!;
      if (lock && !isExpired(lock.lockedAt) && lock.lockedBy !== meEmail && meRole !== "admin") {
        return res.status(423).json({ message: `Thread locked by ${lock.lockedBy}` });
      }
    }
    const submission = await OfficialSubmission.findById(id);
    if (!submission) return res.status(404).json({ message: "Not found" });

    // prevent double voting
    const existing = (submission.votesByUser || []).find((v: any) => v.userId === userId);
    if (existing) {
      if (existing.type === type) {
        // no change
      } else {
        // flip vote
        if (type === "up") {
          submission.votes.up += 1;
          submission.votes.down = Math.max(0, submission.votes.down - 1);
        } else {
          submission.votes.down += 1;
          submission.votes.up = Math.max(0, submission.votes.up - 1);
        }
        existing.type = type;
        existing.votedAt = new Date();
      }
    } else {
      // new vote
      if (type === "up") submission.votes.up += 1;
      else submission.votes.down += 1;
      submission.votesByUser = submission.votesByUser || [];
      submission.votesByUser.push({ userId, type, votedAt: new Date() });
    }

    await submission.save();
    res.json(submission);
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ message: "Failed to vote" });
  }
});

// POST /api/officials/submissions/:id/resolve
// body: { action: "approve"|"reject", verify?: boolean, fieldOverrides?: {}, closeThread?: boolean, resolution?: string }
router.post("/:id/resolve", requireAdminOrPartner, async (req, res) => {
  const LOCK_TTL_MIN = Number(process.env.REVIEW_LOCK_TTL_MINUTES || 30);
  const isExpired = (d: Date) => !d || d.getTime() < Date.now() - LOCK_TTL_MIN * 60 * 1000;

  try {
    const {
      action: rawAction,
      verify = false,
      fieldOverrides = {},
      closeThread = false,
      resolution, // for reject
    } = req.body || {};

    const submission = await OfficialSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    // Enforce lock (if thread)
    if (submission.groupKey) {
      const lock = await ThreadLock.findOne({ groupKey: submission.groupKey });
      const meEmail = req.session.user!.email!;
      const meRole = req.session.user!.role!;
      if (lock && !isExpired(lock.lockedAt) && lock.lockedBy !== meEmail && meRole !== "admin") {
        return res.status(423).json({ message: `Thread locked by ${lock.lockedBy}` });
      }
    }

    const action = rawAction === "approve" || rawAction === "reject" ? rawAction : null;
    if (!action) return res.status(400).json({ message: "action must be 'approve' or 'reject'" });

    // -------- REJECT --------
    if (action === "reject") {
      submission.status = "rejected";
      submission.resolution = resolution || "rejected by reviewer";
      submission.verifierId = (req.session.user as any)?.email || "system";
      submission.verifiedAt = new Date();
      await submission.save();

      await logReviewEvent({
        reqUser: { email: req.session.user!.email!, role: req.session.user!.role! },
        groupKey: submission.groupKey || submission._id.toString(),
        submissionId: submission._id.toString(),
        action: "reject",
        summary: `Rejected (${submission.resolution})`,
        payload: {
          resolution: submission.resolution,
          dedupe: submission.dedupe || null,
        },
      });
      return res.json({ ok: true, submission });
    }

    // -------- APPROVE / MERGE --------
    const proposed = submission.proposed || {};

    // Normalize issues if names given
    if (Array.isArray(proposed.issues) && proposed.issues.length) {
      const looksLikeNames = proposed.issues.some(
        (v: any) => typeof v === "string" && !/^[a-f0-9]{24}$/i.test(v)
      );
      if (looksLikeNames) {
        const { ids } = await ensureIssuesByNames(proposed.issues as string[]);
        proposed.issues = ids;
      }
    } else {
      proposed.issues = [];
    }

    // Load current official (if edit/update)
    const currentOfficial = submission.targetOfficialId
      ? await OfficialModel.findById(submission.targetOfficialId).lean()
      : null;

    // Merge
    const merged = buildMergedOfficial(currentOfficial, proposed, fieldOverrides);
    if (verify === true) merged.verified = true;

    // Save (create or update)
    const saved = await saveOfficialFromMerge(
      submission.type as "create" | "edit",
      submission.targetOfficialId as any,
      merged
    );

    // Update submission
    submission.status = "approved";
    submission.targetOfficialId = saved?._id || submission.targetOfficialId;
    submission.verifierId = (req.session.user as any)?.email || "system";
    submission.verifiedAt = new Date();
    submission.resolution = "approved";
    await submission.save();

    // Optionally close thread (mark siblings)
    if (closeThread && submission.groupKey) {
      await OfficialSubmission.updateMany(
        { groupKey: submission.groupKey, _id: { $ne: submission._id } },
        { $set: { status: "superseded" } }
      );
      // Release lock if any
      await ThreadLock.deleteOne({ groupKey: submission.groupKey });
    }

    // Audit log
    const summary = `Approved${verify ? " & verified" : ""}${closeThread ? " · closed thread" : ""}`;
    await logReviewEvent({
      reqUser: { email: req.session.user!.email!, role: req.session.user!.role! },
      groupKey: submission.groupKey || submission._id.toString(),
      submissionId: submission._id.toString(),
      action: "approve",
      summary,
      payload: {
        targetOfficialId: submission.targetOfficialId || null,
        fieldOverrides: fieldOverrides || null,
        verify: !!verify,
        closeThread: !!closeThread,
        dedupe: submission.dedupe || null,
      },
    });

    emitEvent("official.updated", { officialId: saved._id, submissionId: submission._id });

    return res.json({ ok: true, official: saved, submission });
  } catch (err: any) {
    console.error("resolve error:", err);
    return res.status(500).json({ message: "Failed to resolve submission", error: err.message });
  }
});

/**
 * GET /api/officials/submissions/threads
 * Query params:
 *  - status: pending | conflict | approved | rejected | duplicate | all (default: pending)
 *  - q: search string (name/email/role)
 *  - limit, skip
 */
router.get("/threads", requireAdminOrPartner, async (req, res) => {
  const status = (req.query.status as string) || "pending";
  const q = (req.query.q as string) || "";
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
  const skip = parseInt((req.query.skip as string) || "0", 10);

  const filter: any = { groupLeaderId: null };
  if (status !== "all") filter.status = status;

  if (q) {
    filter.$or = [
      { "proposed.fullName": { $regex: q, $options: "i" } },
      { "proposed.email": { $regex: q, $options: "i" } },
      { "proposed.role": { $regex: q, $options: "i" } },
    ];
  }

  const [total, leaders] = await Promise.all([
    OfficialSubmission.countDocuments(filter),
    OfficialSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  // leaders already contain variants[] and relatedCount
  const threads = leaders.map((l) => ({
    groupKey: l.groupKey,
    leader: l,
    relatedCount: l.relatedCount || 0,
    variants: l.variants || [], // lightweight samples for the list
    latestAt: l.updatedAt || l.createdAt,
  }));

  res.json({ total, limit, skip, threads });
});

/**
 * GET /api/officials/submissions/threads/:groupKey
 * Returns the leader + all child submissions in the thread (for deep review)
 */
router.get("/threads/:groupKey", requireAdminOrPartner, async (req, res) => {
  const { groupKey } = req.params;

  const leader = await OfficialSubmission.findOne({
    groupKey,
    groupLeaderId: null,
  }).lean();

  if (!leader) return res.status(404).json({ message: "Thread not found" });

  const children = await OfficialSubmission.find({
    groupKey,
    groupLeaderId: leader._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  // Optional: quick counts by status inside the thread
  const stats = children.reduce(
    (acc: any, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    { [leader.status]: 1 }
  );

  res.json({
    groupKey,
    leader,
    children,
    stats,
  });
});

export default router;
