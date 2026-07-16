const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { calculateLevel } = require("../utils/levelSystem");

router.post("/add", async (req, res) => {
  try {
    const { userId, points } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Add points
    user.points += points;

    // Recalculate level
    user.level = calculateLevel(user.points);

    await user.save();

    res.json({
      message: "Points added!",
      points: user.points,
      level: user.level
    });

  } catch (error) {
    console.error("POINT ADD ERROR:", error);
    res.status(500).json({ message: "Failed to add points" });
  }
});

module.exports = router;
