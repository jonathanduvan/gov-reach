import dotenv from "dotenv";
import { connectToDatabase } from "../../db.js";
import Official from "../../models/Official.js";
import EmailGroup from "../../models/EmailGroup.js";

dotenv.config();

await connectToDatabase();

export async function seedTestData() {
    try {
        console.log("🧪 Seeding test data...");

        // Wipe existing collections
        await Official.deleteMany({});
        await EmailGroup.deleteMany({});

        // Sample officials
        const officials = await Official.insertMany([
            {
                fullName: "Jane Smith",
                role: "U.S. Senator",
                email: "jane.smith@senate.gov",
                state: "CA",
                category: "Senator",
                level: "federal",
                issues: ["Climate", "Energy"],
                partners: ["Green Future"],
                verified: true
            },
            {
                fullName: "Carlos Rivera",
                role: "State Representative",
                email: "c.rivera@assembly.ca.gov",
                state: "CA",
                category: "Representative",
                level: "state",
                issues: ["Energy", "Housing"],
                partners: ["Sunrise Movement"],
                verified: true
            },
            {
                fullName: "Aisha Khan",
                role: "City Council Member",
                email: "a.khan@oakland.gov",
                state: "CA",
                category: "Council Member",
                level: "municipal",
                issues: ["Housing", "Police Reform"],
                partners: ["Local Advocacy Network"],
                verified: false
            }
        ]);

        // Sample campaign
        await EmailGroup.create({
            title: "Support California Clean Energy Legislation",
            description: "Urge your officials to support new clean energy bills in California.",
            issues: ["Energy", "Climate"],
            partner: "Green Future",
            officials: [officials[0]._id, officials[1]._id],
            messageTemplate: "Dear [Official Name], I urge you to support clean energy initiatives in California.",
            status: "approved"
        });

        console.log("✅ Test data seeded successfully.");
    } catch (err) {
        console.error("❌ Failed to seed test data:", err);
    } finally {
        process.exit(0);
    }
}

// Only run if executed directly via CLI
if (process.argv[1].includes("seedTestData.js")) {
    await seedTestData();
}
