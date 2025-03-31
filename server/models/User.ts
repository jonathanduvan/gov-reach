import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        role: {
            type: String,
            enum: ["admin", "partner", "contributor"],
            required: true
        },
        approved: { type: Boolean, default: false },
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner" },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
