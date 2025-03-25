import express, { Request, Response } from "express";
import OfficialModel from "../models/Official.js";
import { Official } from "../../shared/types/official.js";

const router = express.Router();

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

// PUT /api/officials/:id/verify - Verify or unverify an official
router.put("/:id/verify", async (req: Request, res: Response) => {
    try {
        const updated = await OfficialModel.findByIdAndUpdate(
            req.params.id,
            { verified: req.body.verified },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        console.error("Error updating verification:", err);
        res.status(400).json({ message: "Failed to verify official" });
    }
});

export default router;
