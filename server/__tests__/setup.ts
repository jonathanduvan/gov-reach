import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

/**
 * Use this to connect the DB before integration tests or seed runs
 */
export async function initTestDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("🧪 MongoDB connected for test env");
    } catch (err) {
        console.error("❌ MongoDB test connection failed:", err);
        throw err;
    }
}

export async function closeTestDB() {
    await mongoose.connection.close();
    console.log("🧪 MongoDB connection closed");
}
