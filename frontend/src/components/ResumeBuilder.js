import { useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Sparkles, Download, Eye } from "lucide-react";
import html2pdf from "html2pdf.js";
import ReactMarkdown from "react-markdown";


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResumeBuilder = ({ user, onLogout }) => {
  if (!user) return null;

  const [resume, setResume] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Photo upload state
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const safeSkills = user.skills || [];
  const safeExperience = user.experience_level || "Beginner";

  // =============================
  // PHOTO UPLOAD
  // =============================
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setPhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // =============================
  // GENERATE RESUME (AI)
  // =============================
  const generateResume = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/resume`, {
        user_id: user.id,
      });

      setResume(res.data.resume);
      toast.success("Resume generated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // DOWNLOAD PDF
  // =============================
  // =============================
// DOWNLOAD PDF (MULTI-PAGE)
// =============================
const downloadResume = () => {
  const element = document.getElementById("resume-preview");

  const options = {
    margin: [0.5, 0.5, 0.5, 0.5],

    filename: `${user.name.replace(/\s+/g, "_")}_Resume.pdf`,

    image: { type: "jpeg", quality: 0.98 },

    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },

    jsPDF: {
      unit: "in",
      format: "a4",
      orientation: "portrait",
    },

    // ⭐ CRITICAL FOR MULTI-PAGE
    pagebreak: {
      mode: ["avoid-all", "css", "legacy"],
    },
  };

  html2pdf().set(options).from(element).save();

  toast.success("Resume downloaded!");
};

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)",
      }}
    >
      <Navbar user={user} onLogout={onLogout} />

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-bold mb-4">
            Resume Auto-Builder
          </h1>

          <p className="text-gray-600">
            Transform your DevLink profile into a professional resume
          </p>
        </div>

        

        {/* PROFILE SUMMARY */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">
            Your Profile Summary
          </h3>

          <p><b>Name:</b> {user.name}</p>
          <p><b>Email:</b> {user.email}</p>
          <p><b>GitHub:</b> {user.github_username || "N/A"}</p>
          <p><b>Experience:</b> {safeExperience}</p>

          <div className="mt-4">
            <b>Skills:</b>
            <div className="flex gap-2 flex-wrap mt-2">
              {safeSkills.length > 0 ? (
                safeSkills.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 rounded">
                    {s}
                  </span>
                ))
              ) : (
                <span>No skills added</span>
              )}
            </div>
          </div>
        </Card>

        {/* PHOTO UPLOAD */}
        <div className="text-center mb-6">
          <label className="cursor-pointer bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300">
            📷 Upload Photo
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          {photoPreview && (
            <div className="mt-4 flex justify-center">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-28 h-28 rounded-full object-cover border"
              />
            </div>
          )}
        </div>

        {/* GENERATE BUTTON */}
        <div className="text-center mb-8">
          <Button onClick={generateResume} disabled={loading}>
            {loading ? "Generating..." : "Generate Professional Resume"}
          </Button>
        </div>
{/* RESUME OUTPUT */}
{resume && (
  <Card className="p-8">

    <div className="flex justify-between mb-6">
      <h3 className="text-xl font-semibold flex gap-2 items-center">
        <Eye /> Your Resume
      </h3>

      <Button onClick={downloadResume}>
        <Download className="mr-2" /> Download
      </Button>
    </div>

    <div
      id="resume-preview"
      style={{
        width: "794px",
        background: "#ffffff",
        fontFamily: "Segoe UI, Arial",
        padding: "40px",
        color: "#222",
      }}
    >

      {/* HEADER */}
      <div
        style={{
          borderBottom: "3px solid #2563eb",
          paddingBottom: "16px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <img
          src={
            photoPreview ||
            user.profile_image ||
            "https://via.placeholder.com/100"
          }
          alt="profile"
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <div>
          <h1 style={{ fontSize: "34px", margin: 0 }}>
            {user.name}
          </h1>

          <p style={{ margin: "6px 0", color: "#555" }}>
            DevLink Developer
          </p>

          <p style={{ fontSize: "14px", color: "#666" }}>
            {user.email} | GitHub: {user.github_username || "N/A"}
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <h2 style={{ color: "#2563eb" }}>Professional Summary</h2>
      <div style={{ lineHeight: "1.6" }}>
  <ReactMarkdown>{resume}</ReactMarkdown>
</div>

      {/* SKILLS */}
      <h2 style={{ color: "#2563eb", marginTop: "20px" }}>
        Technical Skills
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {safeSkills.map((skill, i) => (
          <span
            key={i}
            style={{
              background: "#e0e7ff",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "13px",
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* PROJECTS */}
      <h2 style={{ color: "#2563eb", marginTop: "24px" }}>
        Projects
      </h2>

      {projects.length > 0 ? (
        projects.map((proj, i) => (
          <div
            key={i}
            style={{
              marginBottom: "14px",
              breakInside: "avoid",
            }}
          >
            <h3 style={{ marginBottom: "4px" }}>
              {proj.title}
            </h3>

            <p style={{ margin: "4px 0", color: "#555" }}>
              {proj.description}
            </p>

            <small style={{ color: "#777" }}>
              Tech: {proj.tech_stack?.join(", ") || "N/A"} |
              Level: {proj.difficulty} |
              Status: {proj.status}
            </small>
          </div>
        ))
      ) : (
        <p>No projects available</p>
      )}

      {/* EXPERIENCE */}
      <h2 style={{ color: "#2563eb", marginTop: "24px" }}>
        Experience Level
      </h2>
      <p>{safeExperience}</p>

      {/* EDUCATION */}
      <h2 style={{ color: "#2563eb", marginTop: "24px" }}>
        Education
      </h2>
      <p>Add your education details here</p>

      {/* ACHIEVEMENTS */}
      <h2 style={{ color: "#2563eb", marginTop: "24px" }}>
        Achievements
      </h2>
      <p>Add your achievements here</p>

    </div>
  </Card>
)}
  
      </div>
    </div>
  );
};

export default ResumeBuilder;