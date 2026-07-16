import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import { toast } from "sonner";
import TasksTab from "./TasksTab";
import RepositoryTab from "./RepositoryTab";
import ProjectChatPanel from "./project/ProjectChat";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${BACKEND_URL}/api`;

const ProjectDetail = ({ user, onLogout }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [tasks, setTasks] = useState([]);
  const [githubRepo, setGithubRepo] = useState("");

  const [plannerPrompt, setPlannerPrompt] = useState("");
  const [plannerPlan, setPlannerPlan] = useState("");
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerGeneratedAt, setPlannerGeneratedAt] = useState("");
  const [creatingTasksFromPlan, setCreatingTasksFromPlan] = useState(false);

  const token = localStorage.getItem("devlink_token");

  useEffect(() => {
    if (!token) {
      toast.error("Please login again");
      navigate("/auth");
      return;
    }

    fetchProject();
    // eslint-disable-next-line
  }, []);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProject(res.data);
      setGithubRepo(res.data.githubRepo || "");

      const taskRes = await axios.get(`${API}/tasks/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks(taskRes.data);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 403) {
        toast.error("Join the project to access it");
        navigate("/projects");
      } else if (err.response?.status === 401) {
        toast.error("Session expired. Login again.");
        navigate("/auth");
      } else {
        toast.error("Failed to load project");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateGithub = async () => {
    try {
      const res = await axios.put(
        `${API}/projects/${projectId}/github`,
        { githubRepo },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProject(res.data);
      toast.success("GitHub link updated");
    } catch (err) {
      toast.error("Failed to update GitHub link");
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const parsePlanToTasks = (planText) => {
    if (!planText || !planText.trim()) return [];

    const lines = planText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const taskLikeLines = lines
      .filter((line) => {
        if (/^(#{1,6}|\*\*|[A-Z][A-Z\s]+:?$)/.test(line)) return false;
        if (/^(project overview|mvp scope|suggested architecture|folder structure|milestone plan|task breakdown|immediate next|risks)/i.test(line)) return false;
        return /^(-|\*|\u2022|\d+[.)])\s+/.test(line);
      })
      .map((line) => line.replace(/^(-|\*|\u2022|\d+[.)])\s+/, "").trim())
      .filter((line) => line.length >= 5);

    const fallbackTasks = taskLikeLines.length
      ? taskLikeLines
      : lines
          .filter((line) => line.length >= 20 && !/:$/.test(line))
          .slice(0, 12);

    const unique = [...new Set(fallbackTasks)].slice(0, 12);

    return unique.map((item) => {
      const clean = item.replace(/\s+/g, " ").trim();
      const title = clean.length > 90 ? `${clean.slice(0, 87)}...` : clean;
      return {
        title,
        description: clean,
      };
    });
  };

  const generateProjectPlan = async () => {
    if (!project) return;

    try {
      setPlannerLoading(true);

      const res = await axios.post(
        `${API}/ai/project-plan`,
        {
          title: project.title,
          description: project.description,
          tech_stack: project.tech_stack,
          difficulty: project.difficulty,
          team_size: project.team_size,
          current_progress: `${completedTasks}/${totalTasks} tasks completed`,
          additional_context: plannerPrompt,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPlannerPlan(res.data?.plan || "No plan returned");
      setPlannerGeneratedAt(new Date().toLocaleString());
      toast.success("Project plan generated");
    } catch (err) {
      console.error("PROJECT PLAN UI ERROR:", err);
      toast.error(err.response?.data?.message || "Failed to generate project plan");
    } finally {
      setPlannerLoading(false);
    }
  };

  const createTasksFromPlan = async () => {
    if (!plannerPlan.trim()) {
      toast.error("Generate a plan first");
      return;
    }

    const parsedTasks = parsePlanToTasks(plannerPlan);

    if (!parsedTasks.length) {
      toast.error("No actionable tasks found in plan");
      return;
    }

    try {
      setCreatingTasksFromPlan(true);

      const results = await Promise.allSettled(
        parsedTasks.map((task) =>
          axios.post(
            `${API}/tasks`,
            {
              projectId: project._id,
              title: task.title,
              description: task.description,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      await fetchProject();

      if (successCount > 0) {
        toast.success(`${successCount} task(s) created from plan`);
        setTab("tasks");
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} task(s) failed to create`);
      }
    } catch (err) {
      console.error("CREATE TASKS FROM PLAN ERROR:", err);
      toast.error("Failed to create tasks from plan");
    } finally {
      setCreatingTasksFromPlan(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!project) return null;

  const progress = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const teamMembers = project?.team_members || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={onLogout} />

      <div className="flex h-[calc(100vh-70px)]">

        {/* Sidebar */}
        <div className="w-64 bg-white border-r p-4 space-y-2">

          <button
            onClick={() => setTab("overview")}
            className={`block w-full text-left px-3 py-2 rounded ${
              tab === "overview"
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setTab("tasks")}
            className={`block w-full text-left px-3 py-2 rounded ${
              tab === "tasks"
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100"
            }`}
          >
            Tasks
          </button>

          <button
            onClick={() => setTab("repo")}
            className={`block w-full text-left px-3 py-2 rounded ${
              tab === "repo"
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100"
            }`}
          >
            Repository
          </button>

          <button
            onClick={() => setTab("chat")}
            className={`block w-full text-left px-3 py-2 rounded ${
              tab === "chat"
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100"
            }`}
          >
            Chat
          </button>

          <button
            onClick={() => setTab("ai")}
            className={`block w-full text-left px-3 py-2 rounded ${
              tab === "ai"
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-100"
            }`}
          >
            AI Project Planner
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">

          {/* ================= OVERVIEW ================= */}
          {tab === "overview" && (
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {project.title}
              </h1>

              <p className="text-gray-600 mb-4">
                {project.description}
              </p>

              <p className="mb-2">
                <strong>Difficulty:</strong> {project.difficulty}
              </p>

              {/* Progress Section */}
              <div className="mt-6 mb-6">
                <p className="mb-2 font-medium">Project Progress</p>

                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <p className="text-sm mt-2">
                  {completedTasks} / {totalTasks} tasks completed ({progress}%)
                </p>
              </div>

              <p className="mb-4">
                <strong>Team:</strong>{" "}
                {project.team_members.length}/{project.team_size}
              </p>

              <div className="mb-6">
                <p className="mb-2 font-medium">Members</p>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">No members yet</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member, idx) => {
                      const memberName = member?.name || "Member";
                      const memberEmail = member?.email || "";
                      const memberKey = String(member?._id || member || idx);

                      return (
                        <div
                          key={memberKey}
                          className="flex items-center justify-between bg-white border rounded px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{memberName}</span>
                          {memberEmail ? (
                            <span className="text-gray-500">{memberEmail}</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap mb-6">
                {project.tech_stack.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold mb-3">
                  GitHub Repository
                </h3>

                <input
                  type="text"
                  placeholder="https://github.com/username/repo"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="w-full border p-2 rounded mb-2"
                />

                <button
                  onClick={updateGithub}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save Repository Link
                </button>

                {project.githubRepo && (
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-3 text-blue-600 underline"
                  >
                    Open GitHub Repository
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ================= TASKS ================= */}
          {tab === "tasks" && (
            <TasksTab projectId={project._id} />
          )}

          {/* ================= REPOSITORY ================= */}
          {tab === "repo" && (
            <RepositoryTab projectId={project._id} />
          )}

          {/* ================= CHAT ================= */}
          {tab === "chat" && (
            <div>
              <ProjectChatPanel
                projectId={project._id}
                user={user}
                canChat
                showHeader
              />
            </div>
          )}

          {/* ================= AI PROJECT PLANNER ================= */}
          {tab === "ai" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-2">
                AI Project Planner
              </h2>

              <p className="text-gray-600">
                Generate a structured project plan based on your current project details.
              </p>

              <div className="bg-white p-4 rounded shadow space-y-3">
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <p><strong>Title:</strong> {project.title}</p>
                  <p><strong>Difficulty:</strong> {project.difficulty || "Not specified"}</p>
                  <p><strong>Team:</strong> {project.team_members.length}/{project.team_size}</p>
                  <p><strong>Progress:</strong> {completedTasks}/{totalTasks} tasks</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(project.tech_stack || []).map((tech, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <textarea
                  value={plannerPrompt}
                  onChange={(e) => setPlannerPrompt(e.target.value)}
                  placeholder="Optional: add timeline, priorities, or constraints."
                  className="w-full border p-3 rounded min-h-28"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={generateProjectPlan}
                    disabled={plannerLoading || creatingTasksFromPlan}
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-70"
                  >
                    {plannerLoading ? "Generating..." : plannerPlan ? "Regenerate Plan" : "Generate Plan"}
                  </button>

                  <button
                    onClick={createTasksFromPlan}
                    disabled={!plannerPlan || plannerLoading || creatingTasksFromPlan}
                    className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
                  >
                    {creatingTasksFromPlan ? "Creating Tasks..." : "Create Tasks from Plan"}
                  </button>
                </div>
              </div>

              {plannerPlan && (
                <div className="bg-white text-gray-900 rounded border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Generated Plan</h3>
                    {plannerGeneratedAt && (
                      <span className="text-xs text-gray-500">{plannerGeneratedAt}</span>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap text-sm leading-6">{plannerPlan}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;


