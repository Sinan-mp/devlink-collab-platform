const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");

// ==============================
// GET USER NOTIFICATIONS
// ==============================
router.get("/", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ message: "user_id required" });
    }

    const items = await Notification.find({ userId: user_id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(items);
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

// ==============================
// CREATE PROJECT INVITE
// ==============================
router.post("/invite", async (req, res) => {
  try {
    const { toUserId, fromUserId, projectId, message } = req.body;

    if (!toUserId || !fromUserId || !projectId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [fromUser, project] = await Promise.all([
      User.findById(fromUserId).select("name"),
      Project.findById(projectId).select("title"),
    ]);

    if (!fromUser || !project) {
      return res.status(404).json({ message: "User or project not found" });
    }

    const finalMessage =
      message?.trim() ||
      `${fromUser.name} invited you to join ${project.title}`;

    const notification = await Notification.create({
      userId: toUserId,
      fromUserId,
      fromUserName: fromUser.name,
      projectId,
      type: "project_invite",
      message: finalMessage,
      read: false,
    });

    res.status(201).json(notification);
  } catch (err) {
    console.error("INVITE ERROR:", err);
    res.status(500).json({ message: "Failed to send invite" });
  }
});

// ==============================
// MARK NOTIFICATION READ
// ==============================
router.put("/:id/read", async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notif);
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

module.exports = router;
