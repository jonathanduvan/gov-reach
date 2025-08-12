import mongoose, { Schema, model } from "mongoose";
import type { Issue as IssueType } from "../../shared/types/issue.js";

const issueSchema = new Schema<IssueType>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
      trim: true,
    },
    aliases: [{ type: String, trim: true, lowercase: true }],
    pending: { type: Boolean, default: true },
    category: { type: String, trim: true },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// auto-generate slug from name if missing
issueSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// quick text search on name/aliases
issueSchema.index({ slug: 1 }, { unique: true });
issueSchema.index({ name: "text", aliases: "text" });

export default model<IssueType>("Issue", issueSchema);
