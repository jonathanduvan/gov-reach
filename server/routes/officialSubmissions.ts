import express, { Request, Response } from "express";
import OfficialSubmission from "../models/OfficialSubmission.js";
import OfficialModel from "../models/Official.js";
import mongoose from "mongoose";
import { requireAdminOrPartner, requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Create a new submission (create or edit)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      type,
      targetOfficialId = null,
      proposed,
      submitterId,
      submitterEmail,
      submitterRole,
    } = req.body;

    if (!type || !proposed || !submitterId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const submission = await OfficialSubmission.create({
      type,
      targetOfficialId,
      proposed,
      submitterId,
      submitterEmail,
      submitterRole,
      status: "pending",
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

// Resolve submission (approve/reject) - only admin/partner
router.post("/:id/resolve", requireAdminOrPartner, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, verifierId, resolution, mergeStrategy } = req.body as {
      action: "approve" | "reject";
      verifierId: string;
      resolution?: string;
      mergeStrategy?: "merge" | "replace";
    };
    const submission = await OfficialSubmission.findById(id);
    if (!submission) return res.status(404).json({ message: "Not found" });

    if (action === "reject") {
      submission.status = "rejected";
      submission.verifierId = verifierId;
      submission.verifiedAt = new Date();
      submission.resolution = resolution || "Rejected";
      await submission.save();
      return res.json(submission);
    }

    // Approve flow
    if (action === "approve") {
      let targetOfficial: any = null;
      if (submission.type === "create") {
        // create new Official
        targetOfficial = await OfficialModel.create({
          ...submission.proposed,
          confidenceScore: 0,
          crowdVotes: { up: 0, down: 0 },
        });
      } else if (submission.type === "edit") {
        if (!submission.targetOfficialId) {
          return res.status(400).json({ message: "Missing targetOfficialId for edit submission" });
        }
        targetOfficial = await OfficialModel.findById(submission.targetOfficialId);
        if (!targetOfficial) return res.status(404).json({ message: "Target official not found" });
        // merge or replace
        if (mergeStrategy === "replace") {
          Object.assign(targetOfficial, submission.proposed);
        } else {
          // shallow merge: proposed keys overwrite
          for (const key of Object.keys(submission.proposed)) {
            (targetOfficial as any)[key] = (submission.proposed as any)[key];
          }
        }
      }

      if (!targetOfficial) {
        return res.status(500).json({ message: "Failed to materialize official" });
      }

      // Append attribution
      targetOfficial.sourceAttributions = targetOfficial.sourceAttributions || [];
      targetOfficial.sourceAttributions.push({
        sourceType: submission.sourceAttribution?.sourceType || "user_submission",
        submittedBy: submission.submitterId,
        submittedAt: submission.createdAt,
        changes: submission.proposed,
        submissionId: submission._id.toString(),
      });

      // Optionally mark as verified if resolver is partner/admin
      // (policy decision: could be implicit or require explicit verify step)
      await targetOfficial.save();

      submission.status = "approved";
      submission.verifierId = verifierId;
      submission.verifiedAt = new Date();
      submission.resolution = resolution || "Approved";
      await submission.save();

      return res.json({ submission, official: targetOfficial });
    }

    res.status(400).json({ message: "Unsupported action" });
  } catch (err) {
    console.error("Resolve error:", err);
    res.status(500).json({ message: "Failed to resolve submission" });
  }
});

export default router;
