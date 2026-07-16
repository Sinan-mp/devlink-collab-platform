    const express = require("express");
    const router = express.Router();
    const Commit = require("../models/Commit");
    const auth = require("../middleware/authMiddleware");

    // Get commits for project
    router.get("/:projectId", auth, async (req, res) => {
    try {
        const commits = await Commit.find({
        projectId: req.params.projectId,
        })
        .populate("userId", "name email")
        .sort({ createdAt: -1 });

        res.json(commits);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch commits" });
    }
    });

    module.exports = router;