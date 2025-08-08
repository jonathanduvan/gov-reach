import mongoose, { Schema, model } from "mongoose";
import { Official } from "../../shared/types/official.js";


const jurisdictionSchema = new Schema(
  {
    city: String,
    county: String,
    congressionalDistrict: String, // e.g., "FL-22"
    stateLegislativeDistrict: String, // optional
  },
  { _id: false }
);

const phoneSchema = new Schema(
  {
    number: { type: String, trim: true, required: true },
    label: {
      type: String,
      enum: ["office", "district", "capitol", "scheduler", "press", "other"],
      default: "office",
    },
    priority: { type: Number, default: 100 },
    verified: { type: Boolean, default: false },
    source: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);


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
      required: true,
    },
    issues: [{ type: Schema.Types.ObjectId, ref: "Issue", index: true }], // new
    partners: [{ type: String, trim: true }],
    verified: { type: Boolean, default: false, index: true },
    crowdVotes: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
    phoneNumbers: { type: [phoneSchema], default: [] },
    confidenceScore: { type: Number, default: 0, index: true },
    sourceAttributions: [
      {
        sourceType: String,
        submittedBy: String,
        submittedAt: Date,
        changes: Schema.Types.Mixed,
      },
    ],
    jurisdiction: jurisdictionSchema, // new structured jurisdiction
  },
  { timestamps: true }
);

officialSchema.index({ state: 1, level: 1, "jurisdiction.city": 1, "jurisdiction.county": 1 });
officialSchema.index({ fullName: "text", role: "text", category: "text" });
officialSchema.index({ "phoneNumbers.number": 1 });

export default model<Official>("Official", officialSchema);