const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../src/models/User");

dotenv.config({ path: path.join(__dirname, "../.env") });

const DATA_PATH = path.join(__dirname, "../../script/demo-users.json");
const PASSWORD = "Devlink123";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not set");
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const users = JSON.parse(raw.replace(/^\uFEFF/, ""));
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await mongoose.connect(process.env.MONGO_URI);

  const ops = users.map((u) => ({
    updateOne: {
      filter: { email: u.email },
      update: {
        $setOnInsert: {
          name: u.name,
          email: u.email,
          password: passwordHash,
          bio: u.bio || "",
          github_username: u.github_username || "",
          linkedin_url: u.linkedin_url || "",
          github_oauth_connected: false,
          experience_level: u.experience_level || "beginner",
          skills: u.skills || [],
          interests: u.interests || [],
          badges: [],
          points: 0,
          level: 1,
          profile_image: "",
          email_verified: true,
          email_otp_hash: "",
          email_otp_expires: null,
        },
      },
      upsert: true,
    },
  }));

  const result = await User.bulkWrite(ops, { ordered: false });
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
