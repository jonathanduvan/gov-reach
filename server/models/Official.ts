import mongoose, { Schema, model } from "mongoose";
import { Official } from "../../shared/types/official.js";

const officialSchema = new Schema<Official>(
    {
        fullName: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        state: { type: String, required: true, trim: true, uppercase: true },
        category: { type: String, required: true, trim: true },
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

// Export typed model
const OfficialModel = model<Official>("Official", officialSchema);
export default OfficialModel;
