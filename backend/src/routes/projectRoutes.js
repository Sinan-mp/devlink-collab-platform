const express = require("express");
const router = express.Router();

const Project = require("../models/Project");
const JoinRequest = require("../models/joinRequest");
const Chat = require("../models/Chat");
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const { sendNewJoinRequestEmail } = require("../utils/email");

const MAX_ACTIVE_PROJECTS = 3;

const countActiveProjectsForUser = async (userId) =>
  Project.countDocuments({
    status: "open",
    team_members: userId,
  });

// ==============================
// GET ALL PROJECTS
// ==============================
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("team_members", "name email");

    res.json(projects);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// ==============================
// CREATE PROJECT
// ==============================
router.post("/", async (req, res) => {
  try {
    const creatorId = req.query.creator_id;
    if (!creatorId) {
      return res.status(400).json({ message: "creator_id required" });
    }

    const activeCount = await countActiveProjectsForUser(creatorId);
    if (activeCount >= MAX_ACTIVE_PROJECTS) {
      return res
        .status(400)
        .json({ message: `You can only be in ${MAX_ACTIVE_PROJECTS} active projects` });
    }

    const project = new Project({
      ...req.body,
      creator_id: creatorId,
      team_members: [creatorId],
      status: "open",
    });

    await project.save();

    res.status(201).json(project);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Project creation failed" });
  }
});

// ==============================
// GET JOIN REQUESTS
// ==============================
router.get("/join-requests", async (req, res) => {
  try {
    const { owner_id } = req.query;

    const requests = await JoinRequest.find({ owner_id })
      .populate("requester_id", "name email github_username linkedin_url bio experience_level skills interests profile_image")
      .populate("project_id", "title")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

// ==============================
// UPDATE GITHUB REPO
// ==============================
router.put("/:id/github", auth, async (req, res) => {
  try {
    const { githubRepo } = req.body;

    if (!githubRepo) {
      return res.status(400).json({ message: "GitHub link required" });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.githubRepo = githubRepo;
    await project.save();

    res.json(project);
  } catch (err) {
    console.error("GITHUB UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update GitHub link" });
  }
});

// ==============================
// APPROVE REQUEST
// ==============================
router.post("/join-requests/:id/approve", async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const activeCount = await countActiveProjectsForUser(request.requester_id);
    if (activeCount >= MAX_ACTIVE_PROJECTS) {
      return res.status(400).json({
        message: `User already has ${MAX_ACTIVE_PROJECTS} active projects`,
      });
    }

    await Project.findByIdAndUpdate(
      request.project_id,
      { $addToSet: { team_members: request.requester_id } }
    );

    request.status = "approved";
    await request.save();

    res.json({ message: "Request approved" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to approve request" });
  }
});

// ==============================
// REJECT REQUEST
// ==============================
router.post("/join-requests/:id/reject", async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to reject request" });
  }
});

// ==============================
// SEND JOIN REQUEST
// ==============================
router.post("/:id/request-join", async (req, res) => {
  try {
    const projectId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "user_id required" });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const alreadyJoined = project.team_members.some(
      (memberId) => memberId.toString() === user_id
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: "Already joined" });
    }

    const activeCount = await countActiveProjectsForUser(user_id);
    if (activeCount >= MAX_ACTIVE_PROJECTS) {
      return res.status(400).json({
        message: `You can only be in ${MAX_ACTIVE_PROJECTS} active projects`,
      });
    }

    const existingRequest = await JoinRequest.findOne({
      project_id: projectId,
      requester_id: user_id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent" });
    }

    await JoinRequest.create({
      project_id: projectId,
      owner_id: project.creator_id,
      requester_id: user_id,
      status: "pending",
    });

    // Non-blocking: join request creation should succeed even if email fails.
    const [owner, requester] = await Promise.all([
      User.findById(project.creator_id).select("name email"),
      User.findById(user_id).select("name email"),
    ]);

    sendNewJoinRequestEmail({
      to: owner?.email,
      ownerName: owner?.name || "there",
      requesterName: requester?.name || "A user",
      requesterEmail: requester?.email || "unknown email",
      projectTitle: project.title || "your project",
    }).catch((emailErr) => {
      console.error("JOIN REQUEST EMAIL ERROR:", emailErr);
    });

    res.json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error("JOIN REQUEST ERROR:", error);
    res.status(500).json({ message: "Join request failed" });
  }
});

// ==============================
// GET SINGLE PROJECT
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("team_members", "name email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

// ==============================
// REMOVE MEMBER
// ==============================
router.post("/:id/remove-member", async (req, res) => {
  try {
    const { user_id, creator_id } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!creator_id || project.creator_id.toString() !== creator_id.toString()) {
      return res.status(403).json({ message: "Only the project owner can remove members" });
    }

    if (project.creator_id.toString() === user_id?.toString()) {
      return res.status(400).json({ message: "Project owner cannot be removed" });
    }

    await Project.findByIdAndUpdate(req.params.id, {
      $pull: { team_members: user_id },
    });

    res.json({ message: "Member removed" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to remove member" });
  }
});

// ==============================
// DELETE PROJECT
// ==============================
router.delete("/:id", async (req, res) => {
  try {
    const { creator_id } = req.query;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.creator_id.toString() !== creator_id.toString()) {
      return res.status(403).json({
        message: "You are not allowed to delete this project",
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete project" });
  }
});

// ==============================
// GET CHAT MESSAGES
// ==============================
router.get("/:id/messages", async (req, res) => {
  try {
    const messages = await Chat.find({
      projectId: req.params.id,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// ==============================
// SEND CHAT MESSAGE
// ==============================
router.post("/chat/:id", async (req, res) => {
  try {
    const {
      text,
      message,
      senderId,
      sender_id,
      senderName,
      sender_name,
      replyTo,
      replySenderId,
      replySenderName,
      replyText,
    } = req.body;

    const msg = await Chat.create({
      projectId: req.params.id,
      text: text || message,
      senderId: senderId || sender_id,
      senderName: senderName || sender_name,
      replyTo,
      replySenderId,
      replySenderName,
      replyText,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(req.params.id).emit("receiveMessage", msg);
    }

    res.json(msg);
  } catch {
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;
