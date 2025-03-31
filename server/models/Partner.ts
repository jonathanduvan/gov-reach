import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        contactEmail: { type: String, required: true, lowercase: true, trim: true },
        website: { type: String },
        approved: { type: Boolean, default: false },
        approvedBy: { type: String }, // email of admin who approved
    },
    { timestamps: true }
);

export default mongoose.model("Partner", partnerSchema);
