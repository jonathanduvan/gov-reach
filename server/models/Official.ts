import mongoose from "mongoose";

const officialSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        state: { type: String, required: true, trim: true, uppercase: true },
        category: { type: String, required: true, trim: true }, // e.g., 'Senator', 'Governor'
        level: {
            type: String,
            enum: ["federal", "state", "municipal", "regional", "tribal"],
            required: true
        },
        issues: [{ type: String, trim: true }],
        partners: [{ type: String, trim: true }],
        verified: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export default mongoose.model("Official", officialSchema);
