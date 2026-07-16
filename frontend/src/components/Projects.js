import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, FolderGit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = (process.env.REACT_APP_BACKEND_URL || "http://localhost:5000") + "/api";

const Projects = ({ user, onLogout }) => {

  // ✅ ALL HOOKS MUST BE HERE
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailsProject, setDetailsProject] = useState(null);

  const [searchTerm, setSearchTerm] = useState(""); // ✅ SEARCH STATE HERE

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    tech_stack: [],
    required_skills: [],
    team_size: 3,
    difficulty: 'intermediate'
  });

  const [techInput, setTechInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const normalizeId = (value) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      if (value.$oid) return String(value.$oid);
      if (value._id) return normalizeId(value._id);
      if (typeof value.toString === "function") {
        const converted = value.toString();
        if (converted && converted !== "[object Object]") return converted;
      }
    }
    return "";
  };

  const currentUserId = normalizeId(user?.id || user?._id || user);

  const getCreatorId = (project) => normalizeId(project?.creator_id);

  const isProjectMember = (project) =>
    (project?.team_members || []).some(
      (member) => normalizeId(member) === currentUserId
    );

  useEffect(() => {
    fetchProjects();
  }, []);

  


  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`);
      setProjects(res.data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  // ================= CREATE PROJECT =================

  const createProject = async () => {

    if (!newProject.title || !newProject.description) {
      toast.error("Fill all required fields");
      return;
    }

    try {
      await axios.post(`${API}/projects`, newProject, {
        params: { creator_id: currentUserId }
      });

      toast.success("Project created");

      setDialogOpen(false);
      setNewProject({
        title: '',
        description: '',
        tech_stack: [],
        required_skills: [],
        team_size: 3,
        difficulty: 'intermediate'
      });

      fetchProjects();

    } catch {
      toast.error("Failed to create project");
    }
  };

  // ================= JOIN REQUEST =================

  const joinProject = async (id) => {
    try {
     await axios.post(`${API}/projects/${id}/request-join`, {
  user_id: currentUserId
});


      toast.success("Join request sent");

    } catch {
      toast.error("Failed to send request");
    }
  };

  // ================= REMOVE MEMBER =================

  const removeMember = async (projectId, userId) => {
    try {
      await axios.post(`${API}/projects/${projectId}/remove-member`, {
        user_id: userId,
        creator_id: currentUserId,
      });

      fetchProjects();
      toast.success("Member removed");

    } catch {
      toast.error("Failed to remove member");
    }
  };

  // ================= DELETE PROJECT =================

  const deleteProject = async (projectId) => {

    const confirmDelete = window.confirm("Delete this project?");

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/projects/${projectId}`, {
        params: { creator_id: currentUserId }
      });

      toast.success("Project deleted");
      fetchProjects();

    } catch {
      toast.error("Failed to delete project");
    }
  };

  // ================= ADD TECH & SKILL =================

  const addTech = () => {
    if (techInput && !newProject.tech_stack.includes(techInput)) {
      setNewProject({
        ...newProject,
        tech_stack: [...newProject.tech_stack, techInput]
      });
      setTechInput('');
    }
  };

  const addSkill = () => {
    if (skillInput && !newProject.required_skills.includes(skillInput)) {
      setNewProject({
        ...newProject,
        required_skills: [...newProject.required_skills, skillInput]
      });
      setSkillInput('');
    }
  };


  const filteredProjects = projects
  .filter(project => (project.team_members || []).length < (project.team_size || 0))
  .filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .sort((a, b) => {
    if (searchTerm === "") return 0;

    const aMatch = a.title.toLowerCase().startsWith(searchTerm.toLowerCase());
    const bMatch = b.title.toLowerCase().startsWith(searchTerm.toLowerCase());

    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });


  return (
    <div className="min-h-screen bg-gray-100">

      <Navbar user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex justify-between mb-8">

          <div>
            <h1 className="text-4xl font-bold">Project Marketplace</h1>
            <p className="text-gray-600">Discover collaborative projects</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-5 h-5 mr-2" /> Create Project
              </Button>
            </DialogTrigger>

            <DialogContent>

              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">

                <Input
                  placeholder="Title"
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title:e.target.value})}
                />

                <Textarea
                  placeholder="Description"
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description:e.target.value})}
                />

                <div className="flex gap-2">
                  <Input
                    placeholder="Tech"
                    value={techInput}
                    onChange={e => setTechInput(e.target.value)}
                  />
                  <Button onClick={addTech}>Add</Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Skill"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                  />
                  <Button onClick={addSkill}>Add</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">

                  <Input
                    type="number"
                    value={newProject.team_size}
                    onChange={e => setNewProject({...newProject, team_size:+e.target.value})}
                  />

                  <Select
                    value={newProject.difficulty}
                    onValueChange={v => setNewProject({...newProject, difficulty:v})}
                  >
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>

                </div>

                <Button onClick={createProject} className="w-full btn-primary">
                  Create
                </Button>

              </div>
            </DialogContent>
          </Dialog>
        </div>


        {/* SEARCH BAR */}
<div className="mb-6">
  <Input
    placeholder="Search projects by name..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
</div>



        {/* PROJECT LIST */}


        {loading ? <p>Loading...</p> : (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

           {filteredProjects.map(project => (


              <Card key={project._id} className="p-6">

                

                <div className="flex justify-between mb-3">
                  <FolderGit2 className="w-8 h-8 text-purple-600"/>
                  <span className="bg-green-100 px-2 rounded text-sm">
                    {(project.team_members.length < project.team_size) ? "open" : "closed"}
                  </span>
                </div>

                <h3 className="text-xl font-bold">{project.title}</h3>
                <p className="text-gray-600 mb-3">{project.description}</p>

                <div className="flex justify-between text-sm mb-3">
                  <span>
                    <Users className="inline w-4 h-4 mr-1"/>
                    {project.team_members.length}/{project.team_size}
                  </span>
                  <span>{project.difficulty}</span>
                </div>

                <Button
                  variant="outline"
                  className="w-full mb-2"
                  onClick={() => setDetailsProject(project)}
                >
                  Details
                </Button>

                {/* DELETE */}

                {currentUserId && getCreatorId(project) && currentUserId === getCreatorId(project) && (
                  <Button
                    onClick={() => deleteProject(project._id)}
                    className="w-full mt-2 bg-red-500 text-white hover:bg-red-600"
                  >
                    Delete Project
                  </Button>
                )}

                {/* JOIN */}

                {!isProjectMember(project) &&
                 project.team_members.length < project.team_size && (

                  <Button
                    className="w-full mt-3 btn-primary"
                    onClick={() => setSelectedProject(project)}
                  >
                    Join Project
                  </Button>
                )}

                {/* {project.team_members.some(m => m._id === user.id) && (
                  <Button disabled className="w-full mt-3">
                    Already Joined
                  </Button>
                )} */}
                

{isProjectMember(project) && (
  <Button
    className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white"
    onClick={() => navigate(`/projects/${project._id}`)}
  >
    Open Project
  </Button>
)}




              </Card>
            ))}
          </div>
        )}
      </div>

      {/* JOIN CONDITIONS MODAL */}

      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">

            <h2 className="text-xl font-bold text-center mb-3">
              Join "{selectedProject.title}"
            </h2>

            <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
              <ul className="list-disc pl-4 space-y-1">
                <li>Be active</li>
                <li>Follow team rules</li>
                <li>Complete tasks</li>
                <li>No spam</li>
              </ul>
            </div>

            <div className="flex gap-3">

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedProject(null)}
              >
                Cancel
              </Button>

              <Button
                className="w-full btn-primary"
                onClick={async () => {
                  await joinProject(selectedProject._id);
                  setSelectedProject(null);
                }}
              >
                Join Now
              </Button>

            </div>
          </div>
        </div>
      )}

      {detailsProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[95%] max-w-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold">{detailsProject.title}</h2>
                <p className="text-sm text-gray-600">{detailsProject.description}</p>
              </div>
              <Button variant="outline" onClick={() => setDetailsProject(null)}>
                Close
              </Button>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Team size: {detailsProject.team_members.length}/{detailsProject.team_size} •
              Difficulty: {detailsProject.difficulty} •
              Status: {(detailsProject.team_members.length < detailsProject.team_size) ? "open" : "closed"}
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                {(detailsProject.tech_stack || []).map((tech, i) => (
                  <span key={i} className="badge badge-primary text-xs">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {(detailsProject.required_skills || []).length > 0 ? (
                  detailsProject.required_skills.map((skill, i) => (
                    <span key={i} className="badge badge-success text-xs">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No specific requirements</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Members</p>
              {(detailsProject.team_members || []).length === 0 && (
                <p className="text-sm text-gray-500">No members yet</p>
              )}
              {(detailsProject.team_members || []).map((member) => (
                <div
                  key={member._id}
                  className="flex justify-between bg-gray-100 px-3 py-1 rounded mb-1 text-sm"
                >
                  <span>{member.name}</span>
                  {currentUserId &&
                    getCreatorId(detailsProject) &&
                    currentUserId === getCreatorId(detailsProject) &&
                    normalizeId(member) !== getCreatorId(detailsProject) && (
                      <button
                        onClick={() =>
                          removeMember(
                            detailsProject._id,
                            normalizeId(member)
                          )
                        }
                        className="text-red-500"
                      >
                        Remove
                      </button>
                    )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {!isProjectMember(detailsProject) &&
               detailsProject.team_members.length < detailsProject.team_size && (
                <Button
                  className="w-full btn-primary"
                  onClick={async () => {
                    await joinProject(detailsProject._id);
                    setDetailsProject(null);
                  }}
                >
                  Join Project
                </Button>
              )}
              {isProjectMember(detailsProject) && (
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => navigate(`/projects/${detailsProject._id}`)}
                >
                  Open Project
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Projects;
