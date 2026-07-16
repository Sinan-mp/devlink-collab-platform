const express = require("express");
const router = express.Router();
const File = require("../models/File");
const auth = require("../middleware/authMiddleware");
const Commit = require("../models/Commit");

// Get all files and folders for a project.
router.get("/:projectId", auth, async (req, res) => {
  try {
    const files = await File.find({ projectId: req.params.projectId }).sort({ path: 1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch files" });
  }
});

// Create new file or folder.
router.post("/", auth, async (req, res) => {
  try {
    const { projectId, path, isFolder } = req.body;

    if (!projectId || !path) {
      return res.status(400).json({ message: "projectId and path required" });
    }

    const normalizedPath = String(path).trim();
    if (!normalizedPath) {
      return res.status(400).json({ message: "Path cannot be empty" });
    }

    const finalPath = isFolder
      ? (normalizedPath.endsWith("/") ? normalizedPath : `${normalizedPath}/`)
      : normalizedPath;

    const existing = await File.findOne({ projectId, path: finalPath });
    if (existing) {
      return res.status(400).json({ message: "File or folder already exists" });
    }

    const cleanPath = finalPath.endsWith("/") ? finalPath.slice(0, -1) : finalPath;
    const leafName = cleanPath.split("/").pop() || cleanPath;

    const file = await File.create({
      projectId,
      name: leafName,
      path: finalPath,
      isFolder: Boolean(isFolder),
      language: isFolder ? "folder" : finalPath.split(".").pop(),
      content: "",
      editedBy: req.user.id,
    });

    res.json(file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create file" });
  }
});

// Update file content.
router.put("/:fileId", auth, async (req, res) => {
  try {
    const { content, message } = req.body;
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.isFolder) {
      return res.status(400).json({ message: "Folder content cannot be edited" });
    }

    await Commit.create({
      projectId: file.projectId,
      fileId: file._id,
      userId: req.user.id,
      message: message && message.trim() !== "" ? message : "Updated file",
      contentSnapshot: content,
    });

    file.content = content;
    file.editedBy = req.user.id;
    await file.save();

    res.json(file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update file" });
  }
});

// Delete file or folder.
router.delete("/:fileId", auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.isFolder) {
      const folderPath = file.path.endsWith("/") ? file.path : `${file.path}/`;
      await File.deleteMany({
        projectId: file.projectId,
        path: { $regex: `^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` },
      });
    }

    await File.findByIdAndDelete(file._id);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete file" });
  }
});

module.exports = router;
