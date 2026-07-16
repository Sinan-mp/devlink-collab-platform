const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Project = require("../src/models/Project");

dotenv.config({ path: path.join(__dirname, "../.env") });

const DATA_PATH = path.join(__dirname, "../../script/demo-projects.json");

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not set");
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const projects = JSON.parse(raw.replace(/^\uFEFF/, ""));

  await mongoose.connect(process.env.MONGO_URI);

  const ops = projects.map((p) => ({
    updateOne: {
      filter: { title: p.title },
      update: {
        $setOnInsert: {
          title: p.title,
          description: p.description,
          tech_stack: p.tech_stack || [],
          required_skills: p.required_skills || [],
          team_size: p.team_size || 3,
          team_members: [],
          join_requests: [],
          creator_id: new mongoose.Types.ObjectId(),
          githubRepo: p.githubRepo || "",
          difficulty: p.difficulty || "intermediate",
          status: p.status || "open",
        },
      },
      upsert: true,
    },
  }));

  const result = await Project.bulkWrite(ops, { ordered: false });
  const inserted =
    (result.upsertedCount || 0) +
    (result.insertedCount || 0);

  console.log(
    `Done. Inserted: ${inserted}, matched: ${result.matchedCount || 0}`
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
