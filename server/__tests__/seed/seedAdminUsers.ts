// server/__tests__/seed/seedAdminUsers.ts
import { connectToDatabase } from "../../db.js";
import UserModel from "../../models/User.js";
import { ADMIN_EMAILS } from "../../config.js";

async function seedAdminUsers() {
    await connectToDatabase();

    for (const email of ADMIN_EMAILS) {
        const exists = await UserModel.findOne({ email });

        if (exists) {
            console.log(`⚠️  Admin already exists: ${email}`);
            continue;
        }

        await UserModel.create({
            email,
            name: "admin",
            role: "admin",
            verified: true
        });

        console.log(`✅ Seeded admin user: ${email}`);
    }

    process.exit(0);
}

seedAdminUsers().catch(err => {
    console.error("❌ Failed to seed admin users:", err);
    process.exit(1);
});
