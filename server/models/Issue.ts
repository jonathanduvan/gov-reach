import mongoose, { Schema, model } from "mongoose";

const issueSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    aliases: [{ type: String }],
    description: String,
  },
  { timestamps: true }
);

export default model("Issue", issueSchema);
