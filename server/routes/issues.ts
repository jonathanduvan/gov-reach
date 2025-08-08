// server/routes/issues.ts
import express, { Request, Response } from "express";
import Issue from "../models/Issue.js";
import Official from "../models/Official.js";
import OfficialSubmission from "../models/OfficialSubmission.js";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { requireAdminOrPartner, requireAdmin } from "../middleware/auth.js"; 

const router = express.Router();

/**
 * GET /api/issues
 * Query: q (search), pending ("true"/"false"), limit, page
 * Sorted by pending desc, usageCount desc, name asc
 */
router.get("/", requireAuth, requireAdminOrPartner, async (req: Request, res: Response) => {
  const { q, pending, limit = "25", page = "1" } = req.query as any;

  const filter: any = {};
  if (pending === "true") filter.pending = true;
  if (pending === "false") filter.pending = false;

  if (q && String(q).trim()) {
    // search by name/slug/aliases
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { slug: rx }, { aliases: rx }];
  }

  const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
  const pg = Math.max(1, parseInt(String(page), 10) || 1);
  const skip = (pg - 1) * lim;

  const [items, total] = await Promise.all([
    Issue.find(filter)
      .sort({ pending: -1, usageCount: -1, name: 1 })
      .skip(skip).limit(lim)
      .lean(),
    Issue.countDocuments(filter)
  ]);

  res.json({ items, total, page: pg, limit: lim });
});

/**
 * PATCH /api/issues/:id
 * Body: { name?, pending?, category? }
 */
router.patch("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const patch: any = {};
  if (typeof req.body.name === "string") patch.name = req.body.name;
  if (typeof req.body.category === "string") patch.category = req.body.category;
  if (typeof req.body.pending === "boolean") patch.pending = req.body.pending;

  // slug auto-generates on validate if missing; if name changes we may want to regen explicitly only if no slug given
  const updated = await Issue.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  res.json(updated);
});

/**
 * POST /api/issues/:id/aliases
 * Body: { alias: string }
 */
router.post("/:id/aliases", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const alias = String(req.body.alias || "").trim().toLowerCase();
  if (!alias) return res.status(400).json({ message: "Alias required" });

  const updated = await Issue.findByIdAndUpdate(
    id,
    { $addToSet: { aliases: alias } },
    { new: true }
  );
  res.json(updated);
});

/**
 * DELETE /api/issues/:id/aliases/:alias
 */
router.delete("/:id/aliases/:alias", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id, alias } = req.params;
  const updated = await Issue.findByIdAndUpdate(
    id,
    { $pull: { aliases: String(alias).toLowerCase() } },
    { new: true }
  );
  res.json(updated);
});

/**
 * POST /api/issues/recount
 * Recompute usageCount for all issues (count of Officials referencing)
 */
router.post("/recount", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const agg = await Official.aggregate([
    { $unwind: "$issues" },
    { $group: { _id: "$issues", c: { $sum: 1 } } }
  ]);

  const bulk = Issue.collection.initializeUnorderedBulkOp();
  agg.forEach(({ _id, c }) => {
    bulk.find({ _id }).updateOne({ $set: { usageCount: c } });
  });
  // set zero for those not present
  bulk.find({ _id: { $nin: agg.map((a: any) => a._id) } }).updateMany({ $set: { usageCount: 0 } });

  if (bulk.length > 0) await bulk.execute();
  res.json({ updated: agg.length });
});

/**
 * POST /api/issues/merge
 * Body: { sourceId, targetId, dryRun? }
 * - Move references from source -> target in Officials & OfficialSubmissions.proposed.issues
 * - Add source (name, slug, aliases) to target.aliases
 * - Delete source issue document
 * - Return summary
 */
router.post("/merge", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { sourceId, targetId, dryRun } = req.body || {};
  if (!mongoose.isValidObjectId(sourceId) || !mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: "Invalid source/target id" });
  }
  if (sourceId === targetId) {
    return res.status(400).json({ message: "source and target must differ" });
  }

  const [source, target] = await Promise.all([
    Issue.findById(sourceId).lean(),
    Issue.findById(targetId).lean(),
  ]);
  if (!source || !target) return res.status(404).json({ message: "Source or target issue not found" });

  // counts (dry-run)
  const [offCount, subCount] = await Promise.all([
    Official.countDocuments({ issues: source._id }),
    OfficialSubmission.countDocuments({ "proposed.issues": source._id }),
  ]);

  if (dryRun) {
    return res.json({
      dryRun: true,
      wouldUpdate: { officials: offCount, submissions: subCount },
      target: { id: target._id, name: target.name, slug: target.slug },
      source: { id: source._id, name: source.name, slug: source.slug }
    });
  }

  // execute merge
  // 1) Update refs in Officials
  const offRes = await Official.updateMany(
    { issues: source._id },
    { $addToSet: { issues: target._id }, $pull: { issues: source._id } }
  );

  // 2) Update refs in OfficialSubmissions
  const subRes = await OfficialSubmission.updateMany(
    { "proposed.issues": source._id },
    { $addToSet: { "proposed.issues": target._id }, $pull: { "proposed.issues": source._id } }
  );

  // 3) Move aliases to target (include source.slug & source.name as alias strings)
  const aliasAdditions = Array.from(
    new Set(
      [
        source.slug?.toLowerCase(),
        source.name?.toLowerCase(),
        ...(Array.isArray(source.aliases) ? source.aliases.map(a => String(a).toLowerCase()) : [])
      ].filter(Boolean) as string[]
    )
  );

  await Issue.updateOne(
    { _id: target._id },
    { $addToSet: { aliases: { $each: aliasAdditions } } }
  );

  // 4) Remove the source issue doc (frees its unique slug)
  await Issue.deleteOne({ _id: source._id });

  // 5) Recompute usage counts for target + general clean
  const newUsage = await Official.countDocuments({ issues: target._id });
  await Issue.updateOne({ _id: target._id }, { $set: { usageCount: newUsage, pending: false } });

  res.json({
    merged: true,
    updated: { officials: offRes.modifiedCount, submissions: subRes.modifiedCount },
    aliasAddedCount: aliasAdditions.length,
    targetId: target._id
  });
});

export default router;
