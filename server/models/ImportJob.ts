// server/models/ImportJob.ts
import { Schema, model } from "mongoose";

const importJobSchema = new Schema(
  {
    type: { type: String, enum: ["official-submissions"], required: true },
    status: { type: String, enum: ["queued", "running", "succeeded", "failed"], default: "queued", index: true },
    createdBy: { type: String, required: true }, // user email
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    meta: Schema.Types.Mixed, // optional info (filename, mapping, etc.)
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

export default model("ImportJob", importJobSchema);
