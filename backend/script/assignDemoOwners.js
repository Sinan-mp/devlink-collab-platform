const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");
const User = require("../src/models/User");
const Project = require("../src/models/Project");
const Task = require("../src/models/Task");

dotenv.config({ path: path.join(__dirname, "../.env") });

const OWNER_EMAILS = [
  "yxseen.email@gmail.com",
  "adyaseen4444@gmail.com",
  "muhammadsinanmp2@gmail.com",
  "russelck123@gmail.com",
];

const CORE_EMAILS = [
  "adyaseen4444@gmail.com",
  "muhammadsinanmp2@gmail.com",
  "russelck123@gmail.com",
  "yxseen.email@gmail.com",
];

const DEMO_PASSWORD = "Devlink123";

const nameFromEmail = (email) => {
  const prefix = email.split("@")[0] || "user";
  return prefix
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const ensureOwners = async () => {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const owners = [];

  for (const email of OWNER_EMAILS) {
    const existing = await User.findOne({ email });
    if (existing) {
      owners.push(existing);
      continue;
    }

    const created = await User.create({
      name: nameFromEmail(email),
      email,
      password: hash,
      bio: "",
      github_username: "",
      linkedin_url: "",
      github_oauth_connected: false,
      experience_level: "intermediate",
      skills: [],
      interests: [],
      badges: [],
      points: 0,
      level: 1,
      profile_image: "",
      email_verified: true,
      email_otp_hash: "",
      email_otp_expires: null,
    });
    owners.push(created);
  }

  return owners;
};

const uniqueIds = (ids) => {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!id) continue;
    const key = id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
};

const TASK_BLUEPRINTS = [
  {
    key: "scope",
    title: "Define scope and milestones",
    description: "Finalize MVP scope, split into milestones, and align acceptance criteria.",
    status: "done",
    priority: "high",
  },
  {
    key: "backend",
    title: "Implement core backend APIs",
    description: "Build and validate the main API endpoints and data model layer.",
    status: "inprogress",
    priority: "high",
  },
  {
    key: "frontend",
    title: "Build primary frontend flow",
    description: "Implement the key screens and integrate with backend APIs.",
    status: "todo",
    priority: "medium",
  },
  {
    key: "qa",
    title: "QA pass and bug fixes",
    description: "Run smoke tests, fix high-impact bugs, and prepare release checklist.",
    status: "todo",
    priority: "medium",
  },
];

const ensureProjectTasks = async (project, members) => {
  if (!members.length) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  for (let i = 0; i < TASK_BLUEPRINTS.length; i++) {
    const bp = TASK_BLUEPRINTS[i];
    const stableTitle = `[Seed] ${project.title} - ${bp.title}`;
    const assignee = members[i % members.length];

    let task = await Task.findOne({ projectId: project._id, title: stableTitle });

    if (!task) {
      await Task.create({
        projectId: project._id,
        title: stableTitle,
        description: bp.description,
        assignedTo: assignee,
        status: bp.status,
        priority: bp.priority,
      });
      created++;
      continue;
    }

    let dirty = false;

    if (!task.assignedTo) {
      task.assignedTo = assignee;
      dirty = true;
    }

    if (!task.priority) {
      task.priority = bp.priority;
      dirty = true;
    }

    if (dirty) {
      await task.save();
      updated++;
    }
  }

  return { created, updated };
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not set");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const owners = await ensureOwners();
  const demoOwners = await User.find({ email: /@devlink\.demo$/ }).limit(20);

  const coreMembers = owners.filter((u) => CORE_EMAILS.includes(u.email));
  const memberPool = coreMembers.concat(demoOwners);

  if (!coreMembers.length) {
    throw new Error("Core members not available");
  }

  const projects = await Project.find().sort({ createdAt: 1, title: 1 });

  let projectsUpdated = 0;
  let openCount = 0;
  let closedCount = 0;
  let tasksCreated = 0;
  let tasksUpdated = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    const creator = coreMembers[i % coreMembers.length];
    const shouldClose = i % 5 === 0;

    project.creator_id = creator._id;
    project.status = shouldClose ? "closed" : "open";

    const members = [creator._id];

    for (let j = 0; j < coreMembers.length; j++) {
      const core = coreMembers[(i + j) % coreMembers.length];
      if (members.length >= project.team_size) break;
      members.push(core._id);
    }

    for (let j = 0; j < memberPool.length; j++) {
      if (members.length >= project.team_size) break;
      members.push(memberPool[j]._id);
    }

    project.team_members = uniqueIds(members).slice(0, project.team_size);

    await project.save();
    projectsUpdated++;

    if (project.status === "open") {
      openCount++;
      const taskStats = await ensureProjectTasks(project, project.team_members);
      tasksCreated += taskStats.created;
      tasksUpdated += taskStats.updated;
    } else {
      closedCount++;
    }
  }

  console.log(`Projects updated: ${projectsUpdated}`);
  console.log(`Open projects: ${openCount}`);
  console.log(`Closed projects: ${closedCount}`);
  console.log(`Seed tasks created: ${tasksCreated}`);
  console.log(`Seed tasks updated: ${tasksUpdated}`);
  console.log("Core members included:", coreMembers.map((u) => u.email).join(", "));

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Assign owners failed:", err);
  process.exit(1);
});
