import mongoose, { Schema, model, Types } from "mongoose";
import { ContactGroup } from "../../shared/types/contactGroup.js";

// Schema definition
const contactGroupSchema = new Schema<ContactGroup>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        issues: [{ type: String, trim: true }],
        partner: { type: String, required: true, trim: true },
        officials: [{ type: Schema.Types.ObjectId, ref: "Official" }],
        messageTemplate: { type: String, required: true, trim: true },
        status: { type: String, enum: ["pending", "approved"], default: "pending" }
    },
    { timestamps: true }
);

// Index for partner searches
contactGroupSchema.index({ partner: 1 });

// Export typed model
const EmailGroupModel = model<ContactGroup>("EmailGroup", contactGroupSchema);
export default EmailGroupModel;
