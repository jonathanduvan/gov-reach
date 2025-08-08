// server/middleware/validateSubmission.ts
import { Request, Response, NextFunction } from "express";
import { validateAndCleanProposed } from "../utils/validation.js";
import { ensureIssuesByNames } from "../services/issueService.js";

/**
 * Validates req.body.proposed and normalizes issues to IDs.
 * - Accepts issues as names (strings)
 * - Replaces proposed.issues with ObjectId[] (strings), but also keeps proposed.issueNames
 */
export async function validateAndNormalizeSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { proposed } = req.body || {};
    if (!proposed) return res.status(400).json({ message: "Missing proposed object" });

    const { errors, proposed: cleaned } = validateAndCleanProposed(proposed);
    if (errors.length) return res.status(400).json({ message: "Invalid submission", errors });

    // Normalize issues -> IDs
    let issueNames: string[] = [];
    if (Array.isArray(cleaned.issues)) {
      issueNames = cleaned.issues as string[];
      const { ids, names } = await ensureIssuesByNames(issueNames);
      // Replace issues with IDs (IMPORTANT: your Official.issues expects ObjectIds)
      cleaned.issues = ids;
      (cleaned as any).issueNames = names; // keep names for readability in review UI
    } else {
      cleaned.issues = [];
      (cleaned as any).issueNames = [];
    }

    // Put back on req for the route to use
    req.body.proposed = cleaned;
    next();
  } catch (err) {
    console.error("validateAndNormalizeSubmission error:", err);
    res.status(500).json({ message: "Failed to validate submission" });
  }
}
