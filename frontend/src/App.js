import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "@/components/Dashboard";
import Auth from "@/components/Auth";
import Profile from "@/components/Profile";
import Projects from "@/components/Projects";
import AIPairProgrammer from "@/components/AIPairProgrammer";
import ResumeBuilder from "@/components/ResumeBuilder";
import ProjectDetail from "@/components/ProjectDetail";
import JoinRequests from "@/components/JoinRequests";
import ProjectChat from "@/components/ProjectChat";
import ProfileSetupDialog from "@/components/ProfileSetupDialog";
import VerifyEmail from "@/components/VerifyEmail";

import { Toaster } from "sonner";

function App() {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================
  // LOAD USER FROM LOCAL STORAGE
  // ============================
  useEffect(() => {
    const storedUser = localStorage.getItem("devlink_user");

    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed === "object") {
          setUser({
            ...parsed,
            id: parsed.id || parsed._id
          });
        }
      } catch (error) {
        console.warn("Invalid devlink_user in localStorage, clearing it", error);
        localStorage.removeItem("devlink_user");
        localStorage.removeItem("devlink_token");
      }
    }

    setLoading(false);
  }, []);

  // ============================
  // LOGIN
  // ============================
  const handleLogin = (userData) => {

    const fixedUser = {
      ...userData,
      id: userData.id || userData._id
    };

    setUser(fixedUser);
    localStorage.setItem("devlink_user", JSON.stringify(fixedUser));
  };

  // ============================
  // LOGOUT
  // ============================
  const handleLogout = () => {
    localStorage.removeItem("devlink_user");
    localStorage.removeItem("devlink_token");
    setUser(null);
  };

  // ============================
  // LOADING SCREEN
  // ============================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  // ============================
  // ROUTES
  // ============================
  return (
    <div className="App">

      <Toaster position="top-center" richColors />
      {user && <ProfileSetupDialog user={user} onComplete={handleLogin} />}

      <BrowserRouter>

        <Routes>

          {/* ================= AUTH ================= */}

          <Route
            path="/auth"
            element={
              !user 
                ? <Auth onLogin={handleLogin} /> 
                : <Navigate to="/" />
            }
          />

          {/* ================= VERIFY EMAIL ================= */}

          <Route
            path="/verify-email"
            element={
              user
                ? <Navigate to="/" />
                : <VerifyEmail onLogin={handleLogin} />
            }
          />

          {/* ================= DASHBOARD ================= */}

          <Route
            path="/"
            element={
              user 
                ? <Dashboard user={user} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />

          {/* ================= PROFILE ================= */}

          <Route
            path="/profile"
            element={
              user 
                ? <Profile user={user} setUser={setUser} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />

          {/* ================= PROJECTS ================= */}

          <Route
            path="/projects"
            element={
              user 
                ? <Projects user={user} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />

          {/* ================= PROJECT DETAIL ================= */}

          <Route
            path="/projects/:projectId"
            element={
              user 
                ? <ProjectDetail user={user} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />

          {/* ================= PROJECT CHAT ================= */}

        <Route
  path="/projects/:projectId/chat"
  element={
    user ? (
      <ProjectChat user={user} onLogout={handleLogout} />
    ) : (
      <Navigate to="/auth" />
    )
  }
/>


          {/* ================= JOIN REQUESTS ================= */}

          <Route
            path="/join-requests"
            element={
              user 
                ? <JoinRequests user={user} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />

          {/* ================= AI PAIR ================= */}

          <Route
            path="/ai-pair"
            element={
              user 
                ? <AIPairProgrammer user={user} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />

          {/* ================= RESUME ================= */}

          <Route
            path="/resume"
            element={
              user 
                ? <ResumeBuilder user={user} onLogout={handleLogout} />
                : <Navigate to="/auth" />
            }
          />


        </Routes>

      </BrowserRouter>

    </div>
  );
}

export default App;
