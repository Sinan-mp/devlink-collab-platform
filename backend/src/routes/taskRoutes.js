const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");

// Get all tasks for a project
router.get("/:projectId", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// Create new task
router.post("/", auth, async (req, res) => {
  try {
    const { projectId, title, description, assignedTo, priority } = req.body;

    const task = await Task.create({
      projectId,
      title,
      description,
      assignedTo,
      priority,
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to create task" });
  }
});

// Update task status
router.put("/:taskId", auth, async (req, res) => {
  try {
    const { status } = req.body;

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { status },
      { new: true }
    );

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: "Failed to update task" });
  }
});

// Delete task
router.delete("/:taskId", auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

module.exports = router;