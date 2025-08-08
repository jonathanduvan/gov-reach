// server/routes/batchSubmissions.ts
import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";
import {
  parseUploadedFileToRows,
  ingestRows,
} from "../services/submissionIngest.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

/**
 * POST /api/officials/submissions/batch
 * Accepts CSV or XLSX file; parses and ingests rows.
 */
router.post("/batch", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "CSV or XLSX file required" });

  try {
    const rows = await parseUploadedFileToRows(req.file.path, req.file.originalname);
    const summary = await ingestRows(rows, {
      email: req.session.user!.email!,
      role: req.session.user!.role!,
    });
    res.json(summary);
  } catch (err: any) {
    console.error("Batch upload error:", err);
    res.status(500).json({ message: err.message || "Failed to process batch" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

/**
 * POST /api/officials/submissions/batch-json
 * Accepts a JSON array of rows; ingests them directly.
 */
router.post("/batch-json", requireAuth, async (req: Request, res: Response) => {
  const rows = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ message: "Expected JSON array" });

  try {
    const summary = await ingestRows(rows, {
      email: req.session.user!.email!,
      role: req.session.user!.role!,
    });
    res.json(summary);
  } catch (err: any) {
    console.error("Batch JSON error:", err);
    res.status(500).json({ message: err.message || "Failed to process batch" });
  }
});

export default router;
