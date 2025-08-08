import mongoose, { Schema, model } from "mongoose";


const variantSchema = new Schema(
  {
    proposed: Schema.Types.Mixed,
    submitterId: String,
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const voteByUserSchema = new Schema(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: ["up", "down"], required: true },
    votedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const candidateSchema = new Schema(
  {
    officialId: { type: Schema.Types.ObjectId, ref: "Official", required: true },
    score: Number,
  },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    type: { type: String, enum: ["create", "edit"], required: true },
    targetOfficialId: { type: Schema.Types.ObjectId, ref: "Official", default: null }, // null for new
    proposed: { type: Schema.Types.Mixed, required: true }, // full candidate data or diff
    submitterId: { type: String, required: true },
    submitterEmail: String,
    submitterRole: String, // e.g., 'activist', 'partner', 'admin'
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "conflict", "duplicate"],
      default: "pending",
      index: true,
    },
    dedupe: {
      method: { type: String, enum: ["email", "fuzzy", "none"], default: "none" },
      score: { type: Number, default: 0 },
      candidates: [candidateSchema], // optional shortlist for reviewer
      reason: String,
    },
    groupKey: { type: String, index: true }, // e.g. "official:<id>" or "email:<addr>" or fallback fingerprint
    groupLeaderId: { type: Schema.Types.ObjectId, ref: "OfficialSubmission", default: null },
    relatedCount: { type: Number, default: 0 },     // how many submissions linked to the leader
    variants: [variantSchema],                      // samples of proposed variants for reviewer
    votes: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
    votesByUser: [voteByUserSchema],
    verifierId: { type: String, default: null },
    verifiedAt: Date,
    resolution: String,
    sourceAttribution: {
      sourceType: { type: String, default: "user_submission" },
      originalRaw: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ "proposed.email": 1 });
submissionSchema.index({ status: 1, submitterId: 1 });

export default model("OfficialSubmission", submissionSchema);
