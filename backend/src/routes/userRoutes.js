const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { calculateLevel } = require("../utils/levelSystem");

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  email_verified: Boolean(user.email_verified),
  bio: user.bio || "",
  github_username: user.github_username || "",
  linkedin_url: user.linkedin_url || "",
  github_oauth_connected: Boolean(user.github_oauth_connected),
  experience_level: user.experience_level || "beginner",
  skills: user.skills || [],
  interests: user.interests || [],
  badges: user.badges || [],
  points: user.points ?? 0,
  level: user.level ?? 1,
  profile_image: user.profile_image || "",
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(formatUser(user));
  } catch (error) {
    console.error("GET USER ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (typeof req.body.name === "string") user.name = req.body.name;
    if (typeof req.body.bio === "string") user.bio = req.body.bio;
    if (typeof req.body.github_username === "string") user.github_username = req.body.github_username;
    if (typeof req.body.linkedin_url === "string") user.linkedin_url = req.body.linkedin_url;
    if (typeof req.body.experience_level === "string") user.experience_level = req.body.experience_level;
    if (Array.isArray(req.body.skills)) user.skills = req.body.skills;
    if (Array.isArray(req.body.interests)) user.interests = req.body.interests;

    user.level = calculateLevel(user.points);

    const updatedUser = await user.save();
    return res.json(formatUser(updatedUser));
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

module.exports = router;
