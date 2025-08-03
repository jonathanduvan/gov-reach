import mongoose, { Schema, model } from "mongoose";
import type { Issue as IssueType } from "../../shared/types/issue.js";

const issueSchema = new Schema<IssueType>(
  {
    name: { type: String, required: true, unique: true },
    aliases: [{ type: String }],
    description: String,
  },
  { timestamps: true }
);

export default model<IssueType>("Issue", issueSchema);
