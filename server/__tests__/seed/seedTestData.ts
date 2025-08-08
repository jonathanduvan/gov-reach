import dotenv from "dotenv";
import { connectToDatabase } from "../../db.js";
import Official from "../../models/Official.js";
import ContactGroup from "../../models/ContactGroup.js";
import Issue from "../../models/Issue.js";

dotenv.config();

await connectToDatabase();

export async function seedTestData() {
  try {
    console.log("🧪 Seeding test data...");

    // Wipe existing collections
    await Official.deleteMany({});
    await ContactGroup.deleteMany({});
    await Issue.deleteMany({});

    // Seed normalized issues
    const issuesToSeed = [
      { name: "climate", aliases: ["global warming", "environmental policy"] },
      { name: "energy", aliases: ["clean energy", "renewables"] },
      { name: "housing", aliases: ["affordable housing", "rent"] },
      { name: "police reform", aliases: ["law enforcement reform"] },
    ];

    const issueDocs = [];
    for (const i of issuesToSeed) {
      const doc = await Issue.updateOne(
        { name: i.name },
        { $set: i },
        { upsert: true, new: true }
      );
      // `updateOne` doesn't return the doc; fetch it
      const fetched = await Issue.findOne({ name: i.name });
      if (fetched) issueDocs.push(fetched);
    }

    // Helper to resolve issue names/aliases to Issue _ids
    const resolveNormalizedIds = (legacyNames: string[]) => {
      const lower = legacyNames.map((s) => s.toLowerCase());
      return issueDocs
        .filter(
          (d) =>
            lower.includes(d.name.toLowerCase()) ||
            (d.aliases || []).some((a) => lower.includes(a.toLowerCase()))
        )
        .map((d) => d._id);
    };

    // Sample officials
    const officials = await Official.insertMany([
      {
        fullName: "Jane Smith",
        role: "U.S. Senator",
        email: "jane.smith@senate.gov",
        state: "CA",
        category: "Senator",
        level: "federal",
        // depending on your schema: if `issues` expects ObjectIds, supply those; if it expects strings, you can keep legacy strings too
        issues: resolveNormalizedIds(["Climate", "Energy"]),
        partners: ["Green Future"],
        verified: true,
        crowdVotes: { up: 10, down: 1 },
        confidenceScore: 100,
        jurisdiction: {
          city: "",
          county: "",
          congressionalDistrict: "CA-SEN",
        },
      },
      {
        fullName: "Carlos Rivera",
        role: "State Representative",
        email: "c.rivera@assembly.ca.gov",
        state: "CA",
        category: "Representative",
        level: "state",
        issues: resolveNormalizedIds(["Energy", "Housing"]),
        partners: ["Sunrise Movement"],
        verified: true,
        crowdVotes: { up: 5, down: 0 },
        confidenceScore: 100,
        jurisdiction: {
          city: "Los Angeles",
          county: "Los Angeles",
          congressionalDistrict: "CA-28",
        },
      },
      {
        fullName: "Aisha Khan",
        role: "City Council Member",
        email: "a.khan@oakland.gov",
        state: "CA",
        category: "Council Member",
        level: "municipal",
        issues: resolveNormalizedIds(["Housing", "Police Reform"]),
        partners: ["Local Advocacy Network"],
        verified: false,
        crowdVotes: { up: 2, down: 1 },
        confidenceScore: 1,
        jurisdiction: {
          city: "Oakland",
          county: "Alameda",
          congressionalDistrict: "CA-12",
        },
      },
    ]);

    // Sample campaign / contact group
    await ContactGroup.create({
      title: "Support California Clean Energy Legislation",
      description: "Urge your officials to support new clean energy bills in California.",
      issues: ["Energy", "Climate"], // legacy display
      partner: "Green Future",
      officials: [officials[0]._id, officials[1]._id],
      messageTemplate:
        "Dear [Official Name], I urge you to support clean energy initiatives in California.",
      status: "approved",
      metadata: {
        verticalLookup: {
          issue: "climate",
          location: "California",
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log("✅ Test data seeded successfully.");
  } catch (err) {
    console.error("❌ Failed to seed test data:", err);
  } finally {
    process.exit(0);
  }
}

// Only run if executed directly via CLI
await seedTestData();
