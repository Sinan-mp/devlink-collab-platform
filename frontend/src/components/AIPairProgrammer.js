import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Sparkles, Github, Mail, ExternalLink } from 'lucide-react';

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${BACKEND_URL}/api`;

const AIPairProgrammer = ({ user, onLogout }) => {
  const safeUser = {
    ...user,
    id: user?.id || user?._id,
    skills: user?.skills || [],
    interests: user?.interests || [],
    experience_level: user?.experience_level || "beginner",
  };
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [inviteProjectByUser, setInviteProjectByUser] = useState({});
  const [inviteMessageByUser, setInviteMessageByUser] = useState({});
  const [matchProjectId, setMatchProjectId] = useState("");
  const [matchProject, setMatchProject] = useState(null);
  const [desiredSkills, setDesiredSkills] = useState([]);
  const [desiredInterests, setDesiredInterests] = useState([]);
  const [skillFilterInput, setSkillFilterInput] = useState("");
  const [interestFilterInput, setInterestFilterInput] = useState("");
  const [allProjects, setAllProjects] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileProjects, setSelectedProfileProjects] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get(`${API}/projects`);
        const all = res.data || [];
        setAllProjects(all);
        const mine = all.filter((p) => {
          const members = (p.team_members || []).map((m) =>
            String(m._id || m)
          );
          return (
            String(p.creator_id) === String(safeUser.id) ||
            members.includes(String(safeUser.id))
          );
        });
        setProjects(mine);
      } catch {
        setProjects([]);
      }
    };

    if (safeUser.id) {
      fetchProjects();
    }
  }, [safeUser.id]);

  const findMatches = async () => {
    if (projects.length > 0 && !matchProjectId) {
      toast.error("Select a project first");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/match`, {
        user_id: safeUser.id,
        project_id: matchProjectId || undefined,
        desired_skills: desiredSkills,
        desired_interests: desiredInterests,
      });
      setMatches(response.data.matches || []);
      setMatchProject(response.data.project || null);
      toast.success('Found compatible programming partners!');
    } catch (error) {
      toast.error('Failed to find matches');
    } finally {
      setLoading(false);
    }
  };

  const addDesiredSkill = () => {
    const value = skillFilterInput.trim();
    if (!value || desiredSkills.includes(value)) return;
    setDesiredSkills((prev) => [...prev, value]);
    setSkillFilterInput("");
  };

  const addDesiredInterest = () => {
    const value = interestFilterInput.trim();
    if (!value || desiredInterests.includes(value)) return;
    setDesiredInterests((prev) => [...prev, value]);
    setInterestFilterInput("");
  };

  const removeDesiredSkill = (skill) => {
    setDesiredSkills((prev) => prev.filter((s) => s !== skill));
  };

  const removeDesiredInterest = (interest) => {
    setDesiredInterests((prev) => prev.filter((i) => i !== interest));
  };

  const clearFilters = () => {
    setDesiredSkills([]);
    setDesiredInterests([]);
    setSkillFilterInput("");
    setInterestFilterInput("");
  };

  const filteredMatches = matches.filter((matchData) => {
    if (projects.length > 0) return true;
    const u = matchData.user || {};
    const skills = u.skills || [];
    const interests = u.interests || [];

    const skillOk =
      desiredSkills.length === 0 ||
      desiredSkills.some((s) => skills.includes(s));
    const interestOk =
      desiredInterests.length === 0 ||
      desiredInterests.some((i) => interests.includes(i));

    return skillOk && interestOk;
  });
  const sendInvite = async (matchedUser) => {
    const toUserId = matchedUser?._id || matchedUser?.id;
    const projectId = inviteProjectByUser[toUserId];
    const message = inviteMessageByUser[toUserId] || "";

    if (!projectId) {
      toast.error("Select a project first");
      return;
    }

    try {
      await axios.post(`${API}/notifications/invite`, {
        toUserId,
        fromUserId: safeUser.id,
        projectId,
        message,
      });
      toast.success("Invite sent");
      setInviteMessageByUser((prev) => ({ ...prev, [toUserId]: "" }));
    } catch {
      toast.error("Failed to send invite");
    }
  };

  const openProfile = async (matchedUser) => {
    const targetId = matchedUser?._id || matchedUser?.id;
    if (!targetId) return;

    setProfileOpen(true);
    setProfileLoading(true);

    try {
      const [userRes, projectsRes] = await Promise.all([
        axios.get(`${API}/users/${targetId}`),
        allProjects.length > 0 ? Promise.resolve({ data: allProjects }) : axios.get(`${API}/projects`),
      ]);

      const profile = userRes?.data || matchedUser;
      const projects = projectsRes?.data || [];
      if (allProjects.length === 0) setAllProjects(projects);

      const profileProjects = projects.filter((p) =>
        (p.team_members || []).some((m) => String(m._id || m) === String(targetId))
      );

      setSelectedProfile(profile);
      setSelectedProfileProjects(profileProjects);
    } catch {
      setSelectedProfile(matchedUser);
      setSelectedProfileProjects([]);
      toast.error("Failed to load full profile");
    } finally {
      setProfileLoading(false);
    }
  };


  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)' }}>
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
            AI Pair Programmer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our AI analyzes your skills, interests, and experience level to find the perfect coding partners for collaboration
          </p>
        </div>

        {/* Current Profile */}
        <Card className="p-6 card-glass mb-8" data-testid="current-user-profile">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Your Profile
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {safeUser.skills.length > 0 ? (
                  safeUser.skills.map((skill, i) => (
                    <span key={i} className="badge badge-primary">{skill}</span>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No skills added yet</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {safeUser.interests.length > 0 ? (
                  safeUser.interests.map((interest, i) => (
                    <span key={i} className="badge badge-success">{interest}</span>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No interests added yet</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Experience Level:{" "}
              <span className="badge badge-warning">{safeUser.experience_level}</span>
            </p>
          </div>
        </Card>

        {projects.length > 0 ? (
          <Card className="p-6 card-glass mb-6">
            <h3 className="text-lg font-semibold mb-3">Match For Project</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={matchProjectId}
                onChange={(e) => setMatchProjectId(e.target.value)}
              >
                <option value="">Select one of your projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <Button onClick={findMatches} disabled={loading || !matchProjectId}>
                {loading ? "Finding..." : "Find Partners"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              We’ll prioritize partners who have skills in the selected project’s tech stack.
            </p>
          </Card>
        ) : (
          <Card className="p-6 card-glass mb-6">
            <h3 className="text-lg font-semibold mb-4">No Projects Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add skills and interests you want in a partner to refine results.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Desired Skills</p>
                <div className="flex gap-2 mb-2">
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. backend, node, postgres"
                    value={skillFilterInput}
                    onChange={(e) => setSkillFilterInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDesiredSkill()}
                  />
                  <Button onClick={addDesiredSkill} type="button">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {desiredSkills.length === 0 && (
                    <span className="text-xs text-gray-400">No filters</span>
                  )}
                  {desiredSkills.map((skill) => (
                    <span key={skill} className="badge badge-primary text-xs">
                      {skill}
                      <button
                        onClick={() => removeDesiredSkill(skill)}
                        className="ml-2 text-xs"
                        type="button"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Desired Interests</p>
                <div className="flex gap-2 mb-2">
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. infra, security, AI"
                    value={interestFilterInput}
                    onChange={(e) => setInterestFilterInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDesiredInterest()}
                  />
                  <Button onClick={addDesiredInterest} type="button">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {desiredInterests.length === 0 && (
                    <span className="text-xs text-gray-400">No filters</span>
                  )}
                  {desiredInterests.map((interest) => (
                    <span key={interest} className="badge badge-success text-xs">
                      {interest}
                      <button
                        onClick={() => removeDesiredInterest(interest)}
                        className="ml-2 text-xs"
                        type="button"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                Tip: add skills you need help with (e.g. backend, devops).
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters} type="button">
                Clear Filters
              </Button>
            </div>
          </Card>
        )}

        {/* Find Matches Button */}
        <div className="text-center mb-8">
          <Button
            data-testid="find-matches-button"
            onClick={findMatches}
            disabled={
              loading ||
              safeUser.skills.length === 0 ||
              (projects.length > 0 && !matchProjectId)
            }
            className="btn-primary px-8 py-6 text-lg"
          >
            {loading ? (
              <><div className="loading-spinner mr-3" style={{ width: '20px', height: '20px' }}></div>Finding Matches...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" />Find My Coding Partners</>
            )}
          </Button>
          {safeUser.skills.length === 0 && (
            <p className="text-sm text-gray-500 mt-4">Please add skills to your profile first</p>
          )}
        </div>

        {/* Matches */}
        {filteredMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk' }}>
              Your Compatible Partners
            </h2>
            {matchProject && (
              <p className="text-sm text-gray-500 mb-4">
                Matching for: <span className="font-medium">{matchProject.title}</span>
              </p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((matchData, index) => {
                const matchedUser = matchData.user;
                const match = matchData.match;
                
                return (
                  <Card key={index} data-testid={`match-card-${index}`} className="p-6 card-glass hover-lift">
                    <div className="flex items-center justify-between mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white text-xl font-semibold">
                          {matchedUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-2xl font-bold gradient-text">{match.compatibility_score}%</span>
                        </div>
                        <p className="text-xs text-gray-500">Compatibility</p>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>{matchedUser.name}</h3>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedUser.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="badge badge-primary text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5">Level</p>
                        <span className="badge badge-warning text-xs">{matchedUser.experience_level}</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg mb-4">
                      <p className="text-xs text-gray-600 mb-1">Why you match:</p>
                      <p className="text-sm text-gray-700">{match.reason}</p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <select
                        className="w-full border rounded px-2 py-2 text-sm"
                        value={inviteProjectByUser[matchedUser._id] || ""}
                        onChange={(e) =>
                          setInviteProjectByUser((prev) => ({
                            ...prev,
                            [matchedUser._id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select project to invite</option>
                        {projects.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full border rounded px-2 py-2 text-sm"
                        placeholder="Add a short invite message"
                        value={inviteMessageByUser[matchedUser._id] || ""}
                        onChange={(e) =>
                          setInviteMessageByUser((prev) => ({
                            ...prev,
                            [matchedUser._id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => sendInvite(matchedUser)}
                      >
                        Invite to Project
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => openProfile(matchedUser)}
                      >
                        View Profile
                      </Button>
                      <div className="flex gap-2">
                        {matchedUser.github_username && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(`https://github.com/${matchedUser.github_username}`, '_blank')}
                          >
                            <Github className="w-4 h-4 mr-1" />
                            GitHub
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(`mailto:${matchedUser.email}`, '_blank')}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {matches.length > 0 && filteredMatches.length === 0 && (
          <div className="text-center text-sm text-gray-500">
            {projects.length > 0
              ? "No partners match this project’s tech stack."
              : "No partners match your filters. Try removing some filters."}
          </div>
        )}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Developer Profile</DialogTitle>
              <DialogDescription>
                Review profile, links, and previous project history before inviting.
              </DialogDescription>
            </DialogHeader>

            {profileLoading ? (
              <p className="text-sm text-gray-500">Loading profile...</p>
            ) : selectedProfile ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedProfile.name}</h3>
                    <p className="text-sm text-gray-500">{selectedProfile.email}</p>
                  </div>
                  <span className="badge badge-warning text-xs">
                    {selectedProfile.experience_level || "beginner"}
                  </span>
                </div>

                {selectedProfile.bio && (
                  <div>
                    <p className="text-sm font-medium mb-1">Bio</p>
                    <p className="text-sm text-gray-700">{selectedProfile.bio}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedProfile.skills || []).length > 0 ? (
                        (selectedProfile.skills || []).map((skill, idx) => (
                          <span key={idx} className="badge badge-primary text-xs">{skill}</span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No skills listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedProfile.interests || []).length > 0 ? (
                        (selectedProfile.interests || []).map((interest, idx) => (
                          <span key={idx} className="badge badge-success text-xs">{interest}</span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No interests listed</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProfile.github_username && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://github.com/${selectedProfile.github_username}`,
                          "_blank"
                        )
                      }
                    >
                      <Github className="w-4 h-4 mr-1" />
                      GitHub
                    </Button>
                  )}
                  {selectedProfile.linkedin_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedProfile.linkedin_url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      LinkedIn
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Ongoing Projects ({selectedProfileProjects.filter((p) => p.status === "open").length})
                    </p>
                    <div className="space-y-2 max-h-40 overflow-auto pr-1">
                      {selectedProfileProjects.filter((p) => p.status === "open").map((p) => (
                        <div key={p._id} className="text-xs border rounded p-2 bg-gray-50">
                          <p className="font-medium">{p.title}</p>
                          <p className="text-gray-500">
                            {(p.team_members || []).length}/{p.team_size} members
                          </p>
                        </div>
                      ))}
                      {selectedProfileProjects.filter((p) => p.status === "open").length === 0 && (
                        <p className="text-xs text-gray-500">No ongoing projects</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">
                      Completed Projects ({selectedProfileProjects.filter((p) => p.status === "closed").length})
                    </p>
                    <div className="space-y-2 max-h-40 overflow-auto pr-1">
                      {selectedProfileProjects.filter((p) => p.status === "closed").map((p) => (
                        <div key={p._id} className="text-xs border rounded p-2 bg-green-50">
                          <p className="font-medium">{p.title}</p>
                          <p className="text-gray-500">
                            {(p.team_members || []).length}/{p.team_size} members
                          </p>
                        </div>
                      ))}
                      {selectedProfileProjects.filter((p) => p.status === "closed").length === 0 && (
                        <p className="text-xs text-gray-500">No completed projects</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Profile unavailable</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AIPairProgrammer;

