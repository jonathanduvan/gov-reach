// server/routes/batchSubmissions.ts
import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import ExcelJS from "exceljs";
import OfficialSubmission from "../models/OfficialSubmission.js";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

/**
 * POST /api/officials/submissions/batch
 * Accepts CSV or XLSX file, parses rows, and creates a "create" OfficialSubmission for each.
 */
router.post(
  "/batch",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "CSV or XLSX file required" });
    }

    const ext = req.file.originalname.split(".").pop()!.toLowerCase();
    let rows: any[] = [];

    try {
      if (ext === "csv") {
        // Parse CSV
        await new Promise<void>((resolve, reject) => {
          fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", (row) => rows.push(row))
            .on("end", resolve)
            .on("error", reject);
        });

      } else if (ext === "xlsx") {
        // Parse XLSX via ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        // Read headers from first row
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = (cell.value || "").toString();
        });

        // Process subsequent rows
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const obj: any = {};
          row.eachCell((cell, colNumber) => {
            obj[headers[colNumber]] = cell.value?.toString() ?? "";
          });
          rows.push(obj);
        });

      } else {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      // Create submissions for each row
      let processed = 0;
      for (const row of rows) {
        try {
          const proposed = {
            fullName: row.fullName,
            role: row.role,
            email: row.email,
            state: row.state?.toUpperCase() ?? "",
            category: row.category,
            level: row.level,
            jurisdiction: {
              city: row.city,
              county: row.county,
            },
            issues: (row.issues || "")
              .split(",")
              .map((s: string) => s.trim().toLowerCase()),
            sourceNote: row.sourceNote || undefined,
          };

          await OfficialSubmission.create({
            type: "create",
            proposed,
            submitterId: req.session.user!.email,
            submitterEmail: req.session.user!.email,
            submitterRole: req.session.user!.role,
            status: "pending",
            sourceAttribution: { originalRaw: row },
          });
          processed++;
        } catch (err) {
          console.error("Error processing row:", row, err);
        }
      }

      res.json({ processed });
    } catch (err) {
      console.error("Batch upload error:", err);
      res.status(500).json({ message: "Failed to process batch" });
    } finally {
      // Remove temp file
      fs.unlink(req.file.path, () => {});
    }
  }
);

/**
 * POST /api/officials/submissions/batch-json
 * Accepts a JSON array of proposed objects, each becomes a "create" submission.
 */
router.post("/batch-json", requireAuth, async (req: Request, res: Response) => {
  const rows = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ message: "Expected JSON array" });
  }

  let processed = 0;
  for (const row of rows) {
    try {
      await OfficialSubmission.create({
        type: "create",
        proposed: row,
        submitterId: req.session.user!.email,
        submitterEmail: req.session.user!.email,
        submitterRole: req.session.user!.role,
        status: "pending",
        sourceAttribution: { originalRaw: row },
      });
      processed++;
    } catch (err) {
      console.error("Batch-JSON row error:", row, err);
    }
  }

  res.json({ processed });
});

export default router;
