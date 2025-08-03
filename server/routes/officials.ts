import express, { Request, Response } from "express";
import OfficialModel from "../models/Official.js";
import IssueModel from "../models/Issue.js";
import { Official } from "../../shared/types/official.js";

const router = express.Router();

// GET /api/officials/lookup?lat=...&lng=...&issue=climate&state=CA
router.get("/lookup", async (req: Request, res: Response) => {
  try {
    const { lat, lng, issue, state, city, county } = req.query as Record<string, string>;
    if (!issue || !state) return res.status(400).json({ message: "issue and state required" });

    const issueKey = issue.toLowerCase();
    const issueDocs = await IssueModel.find({
      $or: [{ name: issueKey }, { aliases: issueKey }],
    });
    if (!issueDocs.length) {
      return res.status(404).json({ message: `No issue tag found for "${issue}"` });
    }
    const issueIds = issueDocs.map((d) => d._id);

    const issueFilter = { issues: { $in: issueIds } }; // now only this

    const vertical: Record<string, any[]> = {};

    // 1. Local: city
    if (city) {
      vertical.local = await OfficialModel.find({
        level: { $in: ["municipal", "regional"] },
        state: state.toUpperCase(),
        "jurisdiction.city": { $regex: new RegExp(`^${city}$`, "i") },
        ...issueFilter,
      })
        .sort({ verified: -1, confidenceScore: -1 })
        .lean();
    }

    // 2. County fallback
    if ((!vertical.local || vertical.local.length === 0) && county) {
      vertical.local = await OfficialModel.find({
        level: { $in: ["municipal", "regional"] },
        state: state.toUpperCase(),
        "jurisdiction.county": { $regex: new RegExp(`^${county}$`, "i") },
        ...issueFilter,
      })
        .sort({ verified: -1, confidenceScore: -1 })
        .lean();
    }

    // 3. Proximity fallback
    if ((!vertical.local || vertical.local.length === 0) && lat && lng) {
      const point = {
        type: "Point" as const,
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
      vertical.local = await OfficialModel.find({
        level: { $in: ["municipal", "regional"] },
        state: state.toUpperCase(),
        ...issueFilter,
        location: {
          $near: {
            $geometry: point,
            $maxDistance: 50000,
          },
        },
      })
        .sort({ verified: -1, confidenceScore: -1 })
        .lean();
    }

    // 4. State-level
    vertical.state = await OfficialModel.find({
      level: "state",
      state: state.toUpperCase(),
      ...issueFilter,
    })
      .sort({ verified: -1, confidenceScore: -1 })
      .lean();

    // 5. Federal-level
    vertical.federal = await OfficialModel.find({
      level: "federal",
      state: state.toUpperCase(),
      ...issueFilter,
    })
      .sort({ verified: -1, confidenceScore: -1 })
      .lean();

    res.json(vertical);
  } catch (err) {
    console.error("Lookup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Suggest edit
router.post("/:id/suggest-edit", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const changes = req.body;
    const official = await OfficialModel.findById(id);
    if (!official) return res.status(404).json({ message: "Not found" });

    official.sourceAttributions = official.sourceAttributions || [];
    official.sourceAttributions.push({
      sourceType: "user_submission",
      submittedBy: (req as any).user?.id || "anonymous",
      submittedAt: new Date(),
      changes,
    });
    await official.save();
    res.json({ message: "Suggestion recorded", official });
  } catch (err) {
    console.error("Suggest edit error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Vote
router.post("/:id/vote", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.body as { type: "up" | "down" };
    const official = await OfficialModel.findById(id);
    if (!official) return res.status(404).json({ message: "Not found" });

    official.crowdVotes = official.crowdVotes || { up: 0, down: 0 };
    if (type === "up") official.crowdVotes.up += 1;
    else official.crowdVotes.down += 1;

    official.confidenceScore = official.verified
      ? 100
      : (official.crowdVotes.up || 0) - (official.crowdVotes.down || 0);

    await official.save();
    res.json(official);
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/officials/:id/verify - Verify or unverify an official
router.put("/:id/verify", async (req: Request, res: Response) => {
  try {
    const updated = await OfficialModel.findById(req.params.id);
    if (!updated) return res.status(404).json({ message: "Not found" });

    updated.verified = req.body.verified;
    updated.confidenceScore = updated.verified ? 100 : (updated.crowdVotes?.up || 0) - (updated.crowdVotes?.down || 0);
    await updated.save();
    res.json(updated);
  } catch (err) {
    console.error("Error updating verification:", err);
    res.status(400).json({ message: "Failed to verify official" });
  }
});


// GET /api/officials?state=CA&level=federal&issue=Climate
router.get("/", async (req: Request, res: Response) => {
    try {
        const { state, level, issue, verified } = req.query as {
            state?: string;
            level?: Official["level"];
            issue?: string;
            verified?: string;
        };

        const query: Partial<Record<keyof Official, any>> = {};

        if (state) query.state = state.toUpperCase();
        if (level) query.level = level;
        if (verified !== undefined) query.verified = verified === "true";
        if (issue) query.issues = issue;

        const officials = await OfficialModel.find(query).sort({ fullName: 1 });
        res.json(officials);
    } catch (err) {
        console.error("Error fetching officials:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/officials - Add a new official (manual or admin)
router.post("/", async (req: Request, res: Response) => {
    try {
        const official = new OfficialModel(req.body);
        await official.save();
        res.status(201).json(official);
    } catch (err: any) {
        console.error("Error creating official:", err);
        res.status(400).json({ message: "Invalid data", error: err.message });
    }
});

export default router;
