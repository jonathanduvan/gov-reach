import express, { Request, Response } from "express";
import ContactGroupModel from "../models/ContactGroup.js";
import { ContactGroup } from "../../shared/types/contactGroup.js";

const router = express.Router();

// GET /api/contact-groups?issue=Climate&partner=Sunrise
router.get("/", async (req: Request, res: Response) => {
    try {
        const { issue, partner } = req.query as { issue?: string; partner?: string };
        const query: Partial<ContactGroup> & { status: "approved" } = { status: "approved" };

        if (issue) query.issues = [issue];
        if (partner) query.partner = partner;

        const groups = await ContactGroupModel.find(query).populate("officials");
        res.json(groups);
    } catch (err) {
        console.error("Error fetching contact groups:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/contact-groups - Submit a new campaign
router.post("/", async (req: Request, res: Response) => {
    try {
        const contactGroup = new ContactGroupModel(req.body);
        await contactGroup.save();
        res.status(201).json({ message: "Campaign submitted for review", contactGroup: contactGroup });
    } catch (err: any) {
        console.error("Error creating contact group:", err);
        res.status(400).json({ message: "Invalid campaign", error: err.message });
    }
});

// PUT /api/contact-groups/:id/approve - Approve campaign
router.put("/:id/approve", async (req: Request, res: Response) => {
    try {
        const updated = await ContactGroupModel.findByIdAndUpdate(
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
