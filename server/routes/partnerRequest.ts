// server/routes/partnerRequest.ts
import express from "express";
import { sendPartnerRequestEmail } from "../utils/sendResendEmail.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const { name, org, email, website, campaignInfo } = req.body;

    if (!name || !org || !email || !campaignInfo) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await sendPartnerRequestEmail({ name, org, email, website, campaignInfo });

    if (result.success) {
        res.json({ message: "Request submitted successfully" });
    } else {
        res.status(500).json({ message: "Failed to send request", error: result.message });
    }
});

export default router;
