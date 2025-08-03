import express from "express";
import Issue from "../models/Issue.js";

const router = express.Router();

// GET /api/issues?query=clim
router.get("/", async (req, res) => {
  try {
    const { query } = req.query as { query?: string };
    const filter = query
      ? {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { aliases: { $regex: query, $options: "i" } },
          ],
        }
      : {};
    const issues = await Issue.find(filter).sort({ name: 1 }).lean();
    res.json(issues);
  } catch (e) {
    console.error("Failed to list issues", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
