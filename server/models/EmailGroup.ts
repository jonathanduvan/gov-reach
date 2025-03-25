import mongoose from "mongoose";

const emailGroupSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        issues: [{ type: String, trim: true }], // Tags like ["Climate", "Foreign Policy"]
        partner: { type: String, required: true, trim: true }, // Partner org name
        officials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Official" }], // Linked officials
        messageTemplate: { type: String, required: true, trim: true },
        status: { type: String, enum: ["pending", "approved"], default: "pending" } // Approval process
    },
    { timestamps: true }
);

// ✅ Create an index on partner names for better search
emailGroupSchema.index({ partner: 1 });

export default mongoose.model("EmailGroup", emailGroupSchema);
