import express from "express";
import MessageTemplate from "../models/MessageTemplate.js";

const router = express.Router();

// list (optional filter by category or q)
router.get("/", async (req, res) => {
  const { q, category } = req.query as { q?: string; category?: string };
  const filter: any = {};
  if (category) filter.category = category;
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { description: new RegExp(q, "i") }];
  const items = await MessageTemplate.find(filter).sort({ updatedAt: -1 }).lean();
  res.json(items);
});

router.post("/", async (req, res) => {
  const doc = new MessageTemplate({ ...req.body, createdBy: (req as any).user?.email });
  await doc.save();
  res.status(201).json(doc);
});

router.put("/:id", async (req, res) => {
  const doc = await MessageTemplate.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: (req as any).user?.email },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

router.delete("/:id", async (req, res) => {
  const ok = await MessageTemplate.findByIdAndDelete(req.params.id);
  if (!ok) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

export default router;
