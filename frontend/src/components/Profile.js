import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${BACKEND_URL}/api`;

const Profile = ({ user, setUser, onLogout }) => {
  const navigate = useNavigate();
  const normalizedUser = {
    name: "",
    email: "",
    points: 0,
    level: 1,
    bio: "",
    experience_level: "beginner",
    github_username: "",
    linkedin_url: "",
    skills: [],
    interests: [],
    badges: [],
    ...user,
    skills: user?.skills || [],
    interests: user?.interests || [],
    badges: user?.badges || [],
  };

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myProjects, setMyProjects] = useState([]);

  const [formData, setFormData] = useState({
    name: normalizedUser.name,
    bio: normalizedUser.bio,
    skills: [...normalizedUser.skills],
    interests: [...normalizedUser.interests],
    experience_level: normalizedUser.experience_level,
    github_username: normalizedUser.github_username,
    linkedin_url: normalizedUser.linkedin_url,
  });

  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const ongoingProjects = myProjects.filter((p) => p.status === "open");
  const completedProjects = myProjects.filter((p) => p.status === "closed");

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/users/${normalizedUser.id}`, formData);
      const response = await axios.get(`${API}/users/${normalizedUser.id}`);
      const safeUser = {
        ...response.data,
        skills: response.data.skills || [],
        interests: response.data.interests || [],
        badges: response.data.badges || [],
      };

      setUser(safeUser);
      localStorage.setItem("devlink_user", JSON.stringify(safeUser));
      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get(`${API}/projects`);
        const all = res.data || [];
        const mine = all.filter((p) =>
          (p.team_members || []).some(
            (m) => String(m._id || m) === String(normalizedUser.id)
          )
        );
        setMyProjects(mine);
      } catch {
        setMyProjects([]);
      }
    };

    if (normalizedUser?.id) {
      fetchProjects();
    }
  }, [normalizedUser?.id]);

  const addSkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const addInterest = () => {
    if (newInterest && !formData.interests.includes(newInterest)) {
      setFormData({ ...formData, interests: [...formData.interests, newInterest] });
      setNewInterest("");
    }
  };

  const removeInterest = (interest) => {
    setFormData({ ...formData, interests: formData.interests.filter((i) => i !== interest) });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-zinc-100">
      <Navbar user={normalizedUser} onLogout={onLogout} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 tracking-tight" style={{ fontFamily: "Space Grotesk" }}>
            Profile
          </h1>
          <p className="text-gray-600">Keep your profile sharp and discover better matches.</p>
        </div>

        <Card className="p-8 card-glass mb-6 border border-white/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-900 to-slate-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Avatar className="h-20 w-20">
                      {normalizedUser.profile_image && (
                        <AvatarImage src={normalizedUser.profile_image} alt={normalizedUser.name} />
                      )}
                      <AvatarFallback className="text-3xl font-bold text-white bg-gradient-to-br from-slate-900 to-slate-600">
                        {normalizedUser.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold">{normalizedUser.name}</h2>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Mail className="w-4 h-4" />
                  <span>{normalizedUser.email}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-900 text-white">
                    Level {normalizedUser.level}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-800">
                    {normalizedUser.points} points
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {normalizedUser.badges?.length || 0} badges
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setEditing(!editing)} variant={editing ? "outline" : "default"}>
                {editing ? "Cancel" : "Edit Profile"}
              </Button>
              {editing && (
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-6">
          <Card className="p-8 card-glass border border-white/50">
            <div className="space-y-6">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  disabled={!editing}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  disabled={!editing}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>GitHub Username</Label>
                  <Input
                    value={formData.github_username}
                    disabled={!editing}
                    onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                    placeholder="yourusername"
                  />
                </div>

                <div>
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={formData.linkedin_url}
                    disabled={!editing}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://www.linkedin.com/in/yourname"
                  />
                </div>
              </div>

              <div>
                <Label>Experience Level</Label>
                <Select
                  disabled={!editing}
                  value={formData.experience_level}
                  onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {formData.skills.map((skill, i) => (
                    <Badge key={i} className="flex items-center gap-1">
                      {skill}
                      {editing && (
                        <button onClick={() => removeSkill(skill)}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>

                {editing && (
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addSkill()}
                      placeholder="Add skill..."
                    />
                    <Button onClick={addSkill}>Add</Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {formData.interests.map((interest, i) => (
                    <Badge key={i} className="flex items-center gap-1">
                      {interest}
                      {editing && (
                        <button onClick={() => removeInterest(interest)}>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>

                {editing && (
                  <div className="flex gap-2">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addInterest()}
                      placeholder="Add interest..."
                    />
                    <Button onClick={addInterest}>Add</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 card-glass border border-white/50">
              <h3 className="text-lg font-semibold mb-3">Profile Summary</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <span className="font-medium text-gray-800">Experience:</span> {formData.experience_level}
                </p>
                <p>
                  <span className="font-medium text-gray-800">Skills:</span> {formData.skills.length}
                </p>
                <p>
                  <span className="font-medium text-gray-800">Interests:</span> {formData.interests.length}
                </p>
              </div>
            </Card>

            <Card className="p-6 card-glass border border-white/50">
              <h3 className="text-lg font-semibold mb-3">My Projects</h3>
              {myProjects.length === 0 && (
                <p className="text-sm text-gray-500">No projects yet</p>
              )}
              {myProjects.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      Ongoing ({ongoingProjects.length})
                    </p>
                    {ongoingProjects.length === 0 && (
                      <p className="text-xs text-gray-500">No ongoing projects</p>
                    )}
                    {ongoingProjects.map((project) => (
                      <div key={project._id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium text-sm">{project.title}</p>
                          <p className="text-xs text-gray-500">
                            {(project.team_members || []).length}/{project.team_size} | {project.difficulty}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project._id}`)}>
                          Open
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      Completed ({completedProjects.length})
                    </p>
                    {completedProjects.length === 0 && (
                      <p className="text-xs text-gray-500">No completed projects</p>
                    )}
                    {completedProjects.map((project) => (
                      <div key={project._id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium text-sm">{project.title}</p>
                          <p className="text-xs text-gray-500">
                            {(project.team_members || []).length}/{project.team_size} | {project.difficulty}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project._id}`)}>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
