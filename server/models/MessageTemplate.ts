import { Schema, model } from "mongoose";

const messageTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },            // “Housing: Council outreach”
    description: { type: String, trim: true },
    category: { type: String, trim: true },                        // “Housing”, “Education”
    channel: { type: String, enum: ["email","call"], default: "email" },
    subject: { type: String, trim: true },                         // email only – can use vars
    body: { type: String, required: true },                        // supports {{MERGE_TAGS}}
    tone: { type: String, enum: ["respectful","direct","urgent","neutral"], default: "respectful" },
    length: { type: String, enum: ["short","medium","long"], default: "medium" },
    callToAction: { type: String, trim: true },
    defaultDeadline: { type: String, trim: true },
    orgName: { type: String, trim: true },
    createdBy: { type: String, trim: true },                       // email
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export default model("MessageTemplate", messageTemplateSchema);
