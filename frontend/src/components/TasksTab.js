import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${BACKEND_URL}/api`;

const TasksTab = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const token = localStorage.getItem("devlink_token");

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTasks(res.data);
    } catch (err) {
      toast.error("Failed to load tasks");
    }
  };

  const createTask = async () => {
    if (!newTitle) return;

    try {
      await axios.post(
        `${API}/tasks`,
        {
          projectId,
          title: newTitle,
          description: newDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNewTitle("");
      setNewDescription("");
      fetchTasks();
    } catch (err) {
      toast.error("Failed to create task");
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await axios.put(
        `${API}/tasks/${taskId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchTasks();
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  const renderColumn = (status, title) => (
    <div className="flex-1 bg-gray-100 rounded p-4">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {tasks
          .filter((task) => task.status === status)
          .map((task) => (
            <div key={task._id} className="bg-white p-3 rounded shadow">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-gray-500 mb-2">
                {task.description}
              </p>

              {status !== "done" && (
                <button
                  onClick={() =>
                    updateStatus(
                      task._id,
                      status === "todo" ? "inprogress" : "done"
                    )
                  }
                  className="text-xs bg-purple-500 text-white px-2 py-1 rounded"
                >
                  {status === "todo" ? "Start" : "Mark Done"}
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Add Task Section */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-3">Add New Task</h3>

        <input
          type="text"
          placeholder="Task title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="border p-2 rounded w-full mb-2"
        />

        <textarea
          placeholder="Task description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="border p-2 rounded w-full mb-2"
        />

        <button
          onClick={createTask}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Create Task
        </button>
      </div>

      {/* Task Columns */}
      <div className="flex gap-4">
        {renderColumn("todo", "To Do")}
        {renderColumn("inprogress", "In Progress")}
        {renderColumn("done", "Done")}
      </div>
    </div>
  );
};

export default TasksTab;