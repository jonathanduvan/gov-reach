import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/govreach";

/**
 * Connects to MongoDB using Mongoose.
 */
export async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Successfully connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
}

/**
 * Gracefully closes the database connection when the process exits.
 */
process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("📴 MongoDB connection closed.");
    process.exit(0);
});
