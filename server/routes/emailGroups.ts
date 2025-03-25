import express, { Request, Response } from "express";
import EmailGroupModel from "../models/EmailGroup.ts";
import { EmailGroup } from "../../shared/types/emailGroup.ts";

const router = express.Router();

// GET /api/email-groups?issue=Climate&partner=Sunrise
router.get("/", async (req: Request, res: Response) => {
    try {
        const { issue, partner } = req.query as { issue?: string; partner?: string };
        const query: Partial<EmailGroup> & { status: "approved" } = { status: "approved" };

        if (issue) query.issues = issue;
        if (partner) query.partner = partner;

        const groups = await EmailGroupModel.find(query).populate("officials");
        res.json(groups);
    } catch (err) {
        console.error("Error fetching email groups:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/email-groups - Submit a new campaign
router.post("/", async (req: Request, res: Response) => {
    try {
        const emailGroup = new EmailGroupModel(req.body);
        await emailGroup.save();
        res.status(201).json({ message: "Campaign submitted for review", emailGroup });
    } catch (err: any) {
        console.error("Error creating email group:", err);
        res.status(400).json({ message: "Invalid campaign", error: err.message });
    }
});

// PUT /api/email-groups/:id/approve - Approve campaign
router.put("/:id/approve", async (req: Request, res: Response) => {
    try {
        const updated = await EmailGroupModel.findByIdAndUpdate(
            req.params.id,
            { status: "approved" },
            { new: true }
        );
        res.json({ message: "Campaign approved", updated });
    } catch (err) {
        console.error("Error approving campaign:", err);
        res.status(400).json({ message: "Failed to approve campaign" });
    }
});

export default router;
