const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Project = require("../models/Project");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const normalizeTechStack = (techStack) => {
  if (Array.isArray(techStack)) return techStack.filter(Boolean);
  if (typeof techStack === "string") {
    return techStack
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeTerm = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.\s-]/g, "")
    .replace(/\s+/g, " ");

const STACK_ALIASES = [
  ["react native", "react-native", "rn"],
  ["react", "reactjs", "react.js"],
  ["node", "nodejs", "node.js"],
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["mongodb", "mongo", "mongo db"],
  ["postgresql", "postgres", "psql"],
  ["express", "expressjs", "express.js"],
  ["nextjs", "next.js", "next"],
  ["tailwindcss", "tailwind", "tailwind css"],
];

const findAliasSet = (term) => {
  const normalized = normalizeTerm(term);
  if (!normalized) return [normalized];
  for (const group of STACK_ALIASES) {
    const normalizedGroup = group.map(normalizeTerm);
    if (normalizedGroup.includes(normalized)) {
      return normalizedGroup;
    }
  }
  return [normalized];
};

const expandTerms = (values) => {
  const expanded = new Set();
  (Array.isArray(values) ? values : [])
    .map(normalizeTerm)
    .filter(Boolean)
    .forEach((term) => {
      findAliasSet(term).forEach((alias) => expanded.add(alias));
    });
  return expanded;
};

const extractJsonArray = (rawText) => {
  const text = String(rawText || "").trim();
  if (!text) return null;
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  const candidateJson = cleaned.slice(start, end + 1);
  try {
    const parsed = JSON.parse(candidateJson);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const aiRerankMatches = async ({
  currentUser,
  project,
  candidates,
  desiredSkills,
  desiredInterests,
}) => {
  if (!process.env.GEMINI_API_KEY || candidates.length === 0) {
    return new Map();
  }

  const compactCandidates = candidates.map((item) => ({
    user_id: String(item.user._id),
    name: item.user.name,
    experience_level: item.user.experience_level || "beginner",
    skills: item.user.skills || [],
    interests: item.user.interests || [],
    base_score: item.baseScore,
  }));

  const prompt = `
You are matching collaborators for pair-programming.
Given current user preferences and project context, return only JSON array.

Current user:
- Skills: ${(currentUser.skills || []).join(", ") || "none"}
- Interests: ${(currentUser.interests || []).join(", ") || "none"}
- Experience: ${currentUser.experience_level || "beginner"}

Project context:
- Title: ${project?.title || "N/A"}
- Tech stack: ${(project?.tech_stack || []).join(", ") || "none"}
- Required skills: ${(project?.required_skills || []).join(", ") || "none"}

Desired filters:
- Skills: ${(desiredSkills || []).join(", ") || "none"}
- Interests: ${(desiredInterests || []).join(", ") || "none"}

Candidates:
${JSON.stringify(compactCandidates)}

Return JSON array with one entry per candidate:
[
  {
    "user_id": "string",
    "ai_bonus": number,
    "ai_reason": "short reason"
  }
]

Rules:
- ai_bonus must be integer between 0 and 15.
- Prioritize project tech stack fit, complementary skills, and collaboration fit.
- Do not include markdown or any text outside JSON.
`.trim();

  try {
    const result = await model.generateContent(prompt);
    const aiRows = extractJsonArray(result?.response?.text?.());
    if (!aiRows) return new Map();

    const bonusMap = new Map();
    aiRows.forEach((row) => {
      const userId = String(row?.user_id || "");
      if (!userId) return;
      const rawBonus = Number(row?.ai_bonus);
      const aiBonus = Number.isFinite(rawBonus)
        ? Math.max(0, Math.min(15, Math.round(rawBonus)))
        : 0;
      const aiReason = String(row?.ai_reason || "").trim();
      bonusMap.set(userId, { aiBonus, aiReason });
    });
    return bonusMap;
  } catch (error) {
    console.error("AI MATCH RERANK ERROR:", error?.message || error);
    return new Map();
  }
};

const buildFallbackProjectPlan = ({
  title,
  description,
  techStack,
  difficulty,
  teamSize,
  currentProgress,
  additionalContext,
}) => {
  const stack = techStack.length ? techStack.join(", ") : "Not specified";

  return `
1) Project Overview
- Title: ${title}
- Goal: ${description}
- Suggested Stack: ${stack}
- Difficulty: ${difficulty || "Not specified"}
- Team Size: ${teamSize || "Not specified"}
- Current Progress: ${currentProgress || "Not specified"}

2) MVP Scope
- User authentication and profile setup
- Core project workflow and main feature implementation
- Basic dashboard/reporting for project progress
- Error handling and validation for key forms/actions

3) Suggested Architecture
- Frontend: React components grouped by feature
- Backend: Express routes + controller/service separation
- Database: MongoDB models for users, projects, tasks, and activity
- Integrations: Optional AI helper endpoints behind clear route boundaries

4) Folder Structure
- frontend/src/components
- frontend/src/pages
- frontend/src/utils
- backend/src/routes
- backend/src/models
- backend/src/middleware
- backend/src/utils

5) Milestone Plan
- Milestone 1: Scope finalization, wireframes, data model
- Milestone 2: Core backend APIs and DB integration
- Milestone 3: Core frontend flow and API integration
- Milestone 4: Testing, bug fixing, and release prep

6) Task Breakdown by Role
- Frontend: Build screens, state handling, validations, polish UI
- Backend: Implement APIs, auth checks, DB queries, API docs
- QA/DevOps: Smoke tests, regression checks, deployment verification

7) Immediate Next 5 Actions
- Finalize user stories and acceptance criteria
- Create and assign first 8-12 tasks in backlog
- Implement foundational backend endpoints
- Build frontend skeleton for main workflow
- Run end-to-end smoke test and close top blockers

8) Risks and Mitigations
- Scope creep -> lock MVP and defer non-critical features
- Integration delays -> define API contracts early
- Task imbalance -> rebalance weekly using sprint review
- Quality regressions -> test checklist before each merge

Additional Context
- ${additionalContext || "None"}
`.trim();
};
// ===============================
// RESUME AI (WITH USER PROJECTS)
// ===============================
router.post("/resume", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id)
      return res.status(400).json({ message: "user_id required" });

    // 👤 Get user
    const user = await User.findById(user_id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    // 📌 Get projects CREATED by this user
    const projects = await Project.find({ creator_id: user_id });

    // 🧠 Convert projects to text for AI
    const projectText =
      projects.length > 0
        ? projects
            .map(
              (p, i) => `
Project ${i + 1}:
Title: ${p.title}
Description: ${p.description}
Tech Stack: ${p.tech_stack.join(", ") || "N/A"}
Difficulty: ${p.difficulty}
Status: ${p.status}
`
            )
            .join("\n")
        : "No projects available";

    // 🤖 AI prompt
    const prompt = `
IMPORTANT:
- Output ONLY resume content
- No greetings
- Start with the name

Name: ${user.name}
Email: ${user.email}
Experience Level: ${user.experience_level}
Skills: ${user.skills.join(", ")}
GitHub: ${user.github_username || "Not provided"}

USER PROJECTS:
${projectText}

Format:
Professional Summary
Technical Skills
Projects
Education
Achievements
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // ✅ Send resume + project data to frontend
    res.json({
      resume: text,
      projects: projects,
    });

  } catch (error) {
    console.error("RESUME ERROR:", error);
    res.status(500).json({ message: "Resume generation failed" });
  }
});
// ===============================
// PROJECT PLAN AI
// ===============================
router.post("/project-plan", async (req, res) => {
  try {

    const {
      title,
      description,
      tech_stack,
      difficulty,
      team_size,
      current_progress,
      additional_context,
    } = req.body;

    if (!title || !description)
      return res.status(400).json({ message: "title and description required" });

    const normalizedTechStack = normalizeTechStack(tech_stack);

    const fallbackPlan = buildFallbackProjectPlan({
      title,
      description,
      techStack: normalizedTechStack,
      difficulty,
      teamSize: team_size,
      currentProgress: current_progress,
      additionalContext: additional_context,
    });

    const prompt = `
You are a senior software architect and engineering manager.
Create a practical project plan for a student/developer team.

PROJECT TITLE:
${title}

PROJECT DESCRIPTION:
${description}

TECH STACK:
${normalizedTechStack.join(", ") || "Not specified"}

DIFFICULTY:
${difficulty || "Not specified"}

TEAM SIZE:
${team_size || "Not specified"}

CURRENT PROGRESS:
${current_progress || "Not specified"}

ADDITIONAL CONTEXT:
${additional_context || "None"}

OUTPUT RULES:
- Provide concise and actionable guidance.
- Use plain text and clear headings.
- Include practical sequencing and responsibilities.

OUTPUT FORMAT:
1) Project Overview
2) MVP Scope
3) Suggested Architecture
4) Folder Structure
5) Milestone Plan
6) Task Breakdown by Role (Frontend, Backend, QA/DevOps)
7) Immediate Next 5 Actions
8) Risks and Mitigations
`;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing");
      }

      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.()?.trim();

      if (!text) {
        return res.json({
          plan: fallbackPlan,
          fallback: true,
          warning: "AI returned empty output. Used template plan.",
        });
      }

      return res.json({ plan: text, fallback: false });
    } catch (providerError) {
      console.error("PROJECT PLAN PROVIDER ERROR:", providerError?.message || providerError);
      return res.json({
        plan: fallbackPlan,
        fallback: true,
        warning: "AI provider unavailable. Used template plan.",
      });
    }

  } catch (error) {
    console.error("PROJECT PLAN ERROR:", error);
    return res.status(500).json({ message: "Project plan failed" });
  }
});


// ===============================
// AI PAIR PROGRAMMER MATCH
// ===============================
router.post("/match", async (req, res) => {
  try {

    const {
      user_id,
      project_id,
      desired_skills = [],
      desired_interests = [],
    } = req.body;

    if (!user_id) return res.status(400).json({ message: "user_id required" });

    const currentUser = await User.findById(user_id);

    if (!currentUser)
      return res.status(404).json({ message: "User not found" });

    let project = null;
    let targetSkills = [];
    let excludeUserIds = [user_id];

    if (project_id) {
      project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const techStack = project.tech_stack || [];
      const requiredSkills = project.required_skills || [];
      targetSkills = [...techStack, ...requiredSkills];

      const members = (project.team_members || []).map((m) => m.toString());
      excludeUserIds = excludeUserIds.concat(members);
    }

    const users = await User.find({ _id: { $nin: excludeUserIds } });
    const candidateIds = users.map((u) => u._id);
    const completedCountsRaw = await Project.aggregate([
      {
        $match: {
          status: "closed",
          team_members: { $in: candidateIds },
        },
      },
      { $unwind: "$team_members" },
      { $match: { team_members: { $in: candidateIds } } },
      {
        $group: {
          _id: "$team_members",
          completedCount: { $sum: 1 },
        },
      },
    ]);
    const completedCountMap = new Map(
      completedCountsRaw.map((row) => [String(row._id), row.completedCount || 0])
    );
    const desiredSkillsSet = new Set(
      (Array.isArray(desired_skills) ? desired_skills : [])
        .map(normalizeTerm)
        .filter(Boolean)
    );
    const desiredInterestsSet = new Set(
      (Array.isArray(desired_interests) ? desired_interests : [])
        .map(normalizeTerm)
        .filter(Boolean)
    );
    const targetSkillSet = expandTerms(targetSkills);
    const currentUserSkillSet = expandTerms(currentUser.skills || []);
    const currentUserInterestSet = expandTerms(currentUser.interests || []);

    const matches = [];

    users.forEach((u) => {
      const userSkillSet = expandTerms(u.skills || []);
      const userInterestSet = expandTerms(u.interests || []);

      const stackHits = [...targetSkillSet].filter((term) =>
        userSkillSet.has(term)
      );
      const commonSkillHits = [...currentUserSkillSet].filter((term) =>
        userSkillSet.has(term)
      );
      const commonInterestHits = [...currentUserInterestSet].filter((term) =>
        userInterestSet.has(term)
      );
      const desiredSkillHits = [...desiredSkillsSet].filter((term) =>
        userSkillSet.has(term)
      ).length;
      const desiredInterestHits = [...desiredInterestsSet].filter((term) =>
        userInterestSet.has(term)
      ).length;

      let score = 0;
      const reasons = [];

      if (project && targetSkillSet.size > 0) {
        const stackCoverage = stackHits.length / targetSkillSet.size;
        if (stackHits.length === 0) return;
        score += Math.min(55, Math.round(stackCoverage * 55));
        reasons.push(`Stack fit ${stackHits.length}/${targetSkillSet.size}`);

        if (commonSkillHits.length > 0) {
          const synergyBoost = Math.min(15, commonSkillHits.length * 4);
          score += synergyBoost;
          reasons.push(`Shared skills ${commonSkillHits.length}`);
        }
      } else {
        const userFitBoost = Math.min(
          55,
          commonSkillHits.length * 12 + commonInterestHits.length * 8
        );
        if (userFitBoost === 0) return;
        score += userFitBoost;
        reasons.push(
          `Shared ${commonSkillHits.length} skills and ${commonInterestHits.length} interests`
        );
      }

      const preferenceBoost = Math.min(
        15,
        desiredSkillHits * 6 + desiredInterestHits * 5
      );
      if (preferenceBoost > 0) {
        score += preferenceBoost;
        reasons.push(
          `Preference fit ${desiredSkillHits} skills/${desiredInterestHits} interests`
        );
      }

      const completedCount = completedCountMap.get(String(u._id)) || 0;
      const completedBoost = Math.min(15, completedCount * 3);
      if (completedBoost > 0) {
        score += completedBoost;
        reasons.push(`Delivery history ${completedCount} completed`);
      }

      score = Math.min(100, Math.max(0, Math.round(score)));
      if (score <= 0) return;

      matches.push({
        user: u,
        baseScore: score,
        match: {
          compatibility_score: score,
          reason: reasons.join(" | "),
        },
      });
    });

    matches.sort((a, b) => b.baseScore - a.baseScore);

    const aiBonusMap = await aiRerankMatches({
      currentUser,
      project,
      candidates: matches.slice(0, 12),
      desiredSkills: Array.from(desiredSkillsSet),
      desiredInterests: Array.from(desiredInterestsSet),
    });

    const finalMatches = matches
      .map((entry) => {
        const aiInfo = aiBonusMap.get(String(entry.user._id));
        const aiBonus = aiInfo?.aiBonus || 0;
        const aiReason = aiInfo?.aiReason || "";
        const finalScore = Math.min(
          100,
          Math.max(0, Math.round(entry.baseScore + aiBonus))
        );

        const reason = aiReason
          ? `${entry.match.reason} | AI: ${aiReason}`
          : entry.match.reason;

        return {
          user: entry.user,
          match: {
            compatibility_score: finalScore,
            reason,
          },
        };
      })
      .sort((a, b) => b.match.compatibility_score - a.match.compatibility_score);

    res.json({ matches: finalMatches, project });

  } catch (error) {
    console.error("AI PAIR ERROR:", error);
    res.status(500).json({ message: "Matching failed" });
  }
});
// ===============================
// CODE ASSIST AI
// ===============================
router.post("/code-assist", async (req, res) => {
  try {
    const { prompt, code } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: "prompt is required" });
    }

    const fullPrompt = `
You are a senior software engineer.

USER REQUEST:
${prompt}

CURRENT CODE:
${code || ""}

IMPORTANT:
- Return ONLY the improved code
- No explanations
- No markdown
- No comments outside code
`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    res.json({ result: text });

  } catch (error) {
    console.error("CODE ASSIST ERROR:", error);
    res.status(500).json({ message: "Code assist failed" });
  }
});
module.exports = router;



