// server/models/Official.ts
import mongoose, { Schema, model } from "mongoose";
import { Official } from "../../shared/types/official.js";
import { OFFICE_CATEGORY, normalizeOfficeCategory } from "../utils/officeCategory.js";

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

const committeeSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    chamber: {
      type: String,
      enum: ["house", "senate", "joint", "city", "county", "school", "other"],
      default: "other",
    },
    role: { type: String, trim: true }, // e.g., "Member", "Chair", "Vice Chair"
    source: { type: String, trim: true },
  },
  { _id: false }
);

const officialSchema = new Schema<Official>(
  {
    fullName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },

    // NOTE: no `sparse: true`, no `index: true`, no `unique` here — we define the index explicitly below
    email: { type: String, lowercase: true, trim: true, default: null },

    state: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, required: true, enum: OFFICE_CATEGORY, trim: true },
    level: {
      type: String,
      enum: ["federal", "state", "county", "municipal", "regional", "tribal"],
      required: true,
    },
    issues: [{ type: Schema.Types.ObjectId, ref: "Issue", index: true }],
    partners: [{ type: String, trim: true }],
    verified: { type: Boolean, default: false },
    crowdVotes: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
    phoneNumbers: { type: [phoneSchema], default: [] },
    confidenceScore: { type: Number, default: 0 },
    sourceAttributions: [
      {
        sourceType: String,
        submittedBy: String,
        submittedAt: Date,
        changes: Schema.Types.Mixed,
      },
    ],
    jurisdiction: jurisdictionSchema,
    committees: { type: [committeeSchema], default: [] },
    committeeTags: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

// ---------- Indexes ----------
officialSchema.index({ state: 1, level: 1, "jurisdiction.city": 1, "jurisdiction.county": 1 });
officialSchema.index({ fullName: "text", role: "text", category: "text" });
officialSchema.index({ "phoneNumbers.number": 1 });

// Single explicit partial-unique email index (only when a non-empty string exists)
officialSchema.index(
  { email: 1 },
  {
    name: "uniq_email_when_present",
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

// De-dup US House by state+district when district exists (and is us-house/federal)
officialSchema.index(
  { state: 1, "jurisdiction.congressionalDistrict": 1, category: 1, level: 1 },
  {
    name: "uniq_us_house_state_district",
    unique: true,
    partialFilterExpression: {
      category: "us-house",
      level: "federal",
      "jurisdiction.congressionalDistrict": { $type: "string" },
    },
  }
);

// ---------- Hooks ----------
officialSchema.pre("validate", function (next) {
  const doc = this as any;
  const normalized = normalizeOfficeCategory(doc.category, doc.role);
  if (!normalized) {
    return next(new Error(`Unknown or unsupported category: "${doc.category}" (role: "${doc.role}")`));
  }
  doc.category = normalized;
  next();
});

export default model<Official>("Official", officialSchema);
