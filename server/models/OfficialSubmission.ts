import mongoose, { Schema, model } from "mongoose";

const voteByUserSchema = new Schema(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: ["up", "down"], required: true },
    votedAt: { type: Date, default: () => new Date() },
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
      enum: ["pending", "approved", "rejected", "conflict"],
      default: "pending",
      index: true,
    },
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

submissionSchema.index({ status: 1, submitterId: 1 });

export default model("OfficialSubmission", submissionSchema);
