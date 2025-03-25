import express from "express";
import Official from "../models/Official.js";

const router = express.Router();

// GET /api/officials?state=CA&level=federal&issue=Climate
router.get("/", async (req, res) => {
    try {
        const { state, level, issue, verified } = req.query;
        const query = {};

        if (state) query.state = state.toUpperCase();
        if (level) query.level = level;
        if (verified !== undefined) query.verified = verified === "true";
        if (issue) query.issues = issue;

        const officials = await Official.find(query).sort({ fullName: 1 });
        res.json(officials);
    } catch (err) {
        console.error("Error fetching officials:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/officials - Add a new official (manual or admin)
router.post("/", async (req, res) => {
    try {
        const official = new Official(req.body);
        await official.save();
        res.status(201).json(official);
    } catch (err) {
        console.error("Error creating official:", err);
        res.status(400).json({ message: "Invalid data", error: err.message });
    }
});

// PUT /api/officials/:id/verify - Verify or unverify an official
router.put("/:id/verify", async (req, res) => {
    try {
        const updated = await Official.findByIdAndUpdate(
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
