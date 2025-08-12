import { Schema, model } from "mongoose";

const reviewEventSchema = new Schema(
  {
    actorEmail: { type: String, required: true, index: true },
    actorRole:  { type: String, required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: "OfficialSubmission" },
    groupKey:   { type: String, required: true, index: true },
    action:     { type: String, enum: ["claim","release","approve","reject","conflict","merge"], required: true },
    summary:    { type: String },              // short human text e.g. "Approved & verified"
    payload:    { type: Schema.Types.Mixed },  // fieldOverrides, reason, targetOfficialId, etc.
  },
  { timestamps: true }
);

// Fast query: latest events in a thread
reviewEventSchema.index({ groupKey: 1, createdAt: -1 });

export default model("ReviewEvent", reviewEventSchema);
