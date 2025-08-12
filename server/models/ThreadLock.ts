import { Schema, model } from "mongoose";

const threadLockSchema = new Schema(
  {
    groupKey: { type: String, required: true, unique: true, index: true },
    lockedBy: { type: String, required: true },           // email
    lockedByRole: { type: String, required: true },       // "partner" | "admin" | "contributor"
    lockedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

threadLockSchema.index(
  { lockedAt: 1 },
  { expireAfterSeconds: Number(process.env.REVIEW_LOCK_TTL_MINUTES || 30) * 60 }
);

export default model("ThreadLock", threadLockSchema);
