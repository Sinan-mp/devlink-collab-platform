import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

/* ----------------------------------
   AUTH TOKEN INTERCEPTOR
---------------------------------- */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("devlink_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ----------------------------------
   GLOBAL RESPONSE HANDLER (OPTIONAL)
---------------------------------- */
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error?.response?.data || error.message);
    return Promise.reject(error?.response?.data || error);
  }
);

/* ----------------------------------
   AUTH
---------------------------------- */
export const authAPI = {
  login: (data) => API.post("/api/auth/login", data),
  register: (data) => API.post("/api/auth/register", data),
  me: () => API.get("/api/auth/me"),
};

/* ----------------------------------
   PROJECT MARKETPLACE
---------------------------------- */
export const projectAPI = {
  getOpenProjects: () => API.get("/api/projects"),

  createProject: (data, creatorId) =>
    API.post(`/api/projects?creator_id=${creatorId}`, data),

  joinProject: (projectId, userId) =>
    API.post(`/api/projects/${projectId}/join`, { user_id: userId }),

  getMyProjects: (userId) =>
    API.get(`/api/projects/my/${userId}`),

  /* ---------- WORKSPACE ---------- */
  getWorkspace: (projectId) =>
    API.get(`/api/projects/${projectId}/workspace`),

  updateProject: (projectId, data) =>
    API.put(`/api/projects/${projectId}`, data),

  /* ---------- CHAT ---------- */
  getProjectChat: (projectId) =>
    API.get(`/api/projects/${projectId}/chat`),

  sendProjectMessage: (projectId, message) =>
    API.post(`/api/projects/${projectId}/chat`, { message }),

  /* ---------- ACTIVITY ---------- */
  getProjectActivity: (projectId) =>
    API.get(`/api/projects/${projectId}/activity`),
};

export default API;
