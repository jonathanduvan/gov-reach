// server/routes/importJobs.ts
import express from "express";
import ImportJob from "../models/ImportJob.js";
import OfficialSubmission from "../models/OfficialSubmission.js";
import { requireAdminOrPartner, requireAuth } from "../middleware/auth.js";
import crypto from "crypto";
import { normalizeOfficeCategory } from "../utils/officeCategory.js";
import { ensureIssuesByNames } from "../services/issueService.js";

const router = express.Router();

/**
 * POST /api/import-jobs
 * body: { records: Array<proposedOfficial>, meta?: any }
 * Each record should look like the "proposed" payload for a submission.
 * We create OfficialSubmissions (type=create) in bulk (unordered), async.
 */
router.post("/", requireAuth, requireAdminOrPartner, async (req, res) => {
  const { records = [], meta } = req.body || {};
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "records must be a non-empty array" });
  }

  const createdBy = req.session.user!.email!;
  const job = await ImportJob.create({
    type: "official-submissions",
    status: "queued",
    createdBy,
    total: records.length,
    meta,
  });

  // process async (no external queue for now)
  setImmediate(async () => {
    try {
      job.status = "running";
      job.startedAt = new Date();
      await job.save();

      const BATCH = 500;
      for (let i = 0; i < records.length; i += BATCH) {
        const slice = records.slice(i, i + BATCH);

        // normalize + pre-resolve issues by names in-batch
        for (const r of slice) {
          // normalize category (if provided)
          if (r.category && r.role) {
            try { r.category = normalizeOfficeCategory(r.category, r.role) || r.category; } catch {}
          }
          // issues may be names; convert to ids (best-effort)
          if (Array.isArray(r.issues) && r.issues.length) {
            const looksLikeNames = r.issues.some((v: any) => typeof v === "string" && !/^[a-f0-9]{24}$/i.test(v));
            if (looksLikeNames) {
              try {
                const { ids } = await ensureIssuesByNames(r.issues as string[]);
                r.issues = ids;
              } catch {/* ignore */}
            }
          }
          // groupKey: prefer email; else hash of (name|state|role)
          const key = r.email
            ? `email:${String(r.email).toLowerCase().trim()}`
            : "key:" + crypto.createHash("sha1").update(`${r.fullName}|${r.state}|${r.role}`).digest("hex");
          r.__groupKey = key;
        }

        // insertMany as submissions (unordered)
        const docs = slice.map((proposed: any) => ({
          type: "create",
          targetOfficialId: null,
          proposed,
          submitterId: createdBy,
          submitterEmail: createdBy,
          submitterRole: "partner",
          status: "pending",
          groupKey: proposed.__groupKey,
          groupLeaderId: null,
        }));

        try {
          await OfficialSubmission.insertMany(docs, { ordered: false });
          job.succeeded += docs.length;
        } catch (e: any) {
          // unordered insert may partially succeed — count what we can
          const w = e?.writeErrors || [];
          const failed = w.length;
          job.failed += failed;
          job.succeeded += Math.max(0, docs.length - failed);
          job.lastError = e?.message || "partial failure";
        }

        job.processed = Math.min(job.processed + docs.length, job.total);
        await job.save();
      }

      job.status = "succeeded";
      job.finishedAt = new Date();
      await job.save();
    } catch (e: any) {
      job.status = "failed";
      job.lastError = e?.message || String(e);
      job.finishedAt = new Date();
      await job.save();
    }
  });

  return res.status(202).json({ jobId: job._id, total: job.total });
});

/** GET /api/import-jobs/:id */
router.get("/:id", requireAuth, requireAdminOrPartner, async (req, res) => {
  const job = await ImportJob.findById(req.params.id).lean();
  if (!job) return res.status(404).json({ message: "Job not found" });
  res.json(job);
});

export default router;
