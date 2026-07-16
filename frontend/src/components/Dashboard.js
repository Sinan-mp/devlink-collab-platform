import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FolderGit2, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const currentUserId = String(user?.id || user?._id || "");

  // Protect from undefined user (prevents crashes)
  if (!user) return null;

  const [stats, setStats] = useState({
    projectCount: 0,
    userProjects: [],
    recentProjects: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${API}/projects`).catch(() => ({ data: [] }));
      const allProjects = res.data || [];

      const userProjects = allProjects.filter(
        (p) =>
          (p.team_members || []).some(
            (member) =>
              String(member?._id || member) === currentUserId
          )
      );

      setStats({
        projectCount: allProjects.length || 0,
        userProjects: userProjects || [],
        recentProjects: allProjects.slice(0, 3) || []
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const features = [
    {
      title: 'AI Pair Programmer',
      description: 'Get matched with compatible coding partners using AI',
      icon: Users,
      color: 'from-purple-500 to-indigo-600',
      path: '/ai-pair'
    },
    {
      title: 'Resume Builder',
      description: 'Auto-generate professional resumes from your projects',
      icon: Target,
      color: 'from-green-500 to-emerald-600',
      path: '/resume'
    },
    {
      title: 'Project Marketplace',
      description: 'Discover and join collaborative projects',
      icon: FolderGit2,
      color: 'from-orange-500 to-red-600',
      path: '/projects'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-3 text-gray-900">
                Welcome back, <span className="text-gray-900">{user.name}</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Your command center for projects, collaboration, and progress.
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/projects")}>
                Browse Projects
              </Button>
              <Button variant="outline" onClick={() => navigate("/ai-pair")}>
                Find Partners
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
          {/* Left */}
          <div className="space-y-6">
            <Card className="p-6 bg-white border rounded-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Projects</h2>
                <Button variant="outline" onClick={() => navigate("/projects")}>
                  View All
                </Button>
              </div>
              {stats.userProjects.length === 0 ? (
                <div className="text-sm text-gray-500">
                  You haven’t joined any projects yet. Explore the marketplace to get started.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {stats.userProjects.slice(0, 4).map((project, index) => (
                    <Card key={index} className="p-5 bg-white border rounded-md cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/projects/${project._id}`)}>
                      <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {project.description || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(project.tech_stack || []).slice(0, 3).map((tech, i) => (
                          <span key={i} className="px-2 py-1 text-xs rounded border bg-gray-100 text-gray-700">{tech}</span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(project.team_members || []).length}/{project.team_size || 1} members
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white border rounded-md">
              <h2 className="text-xl font-semibold mb-4">Explore Recent Projects</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {stats.recentProjects.map((project, index) => (
                  <div key={index} className="p-4 rounded-md border bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{project.title || "Untitled Project"}</h3>
                      <span className="text-xs text-gray-500">{project.difficulty || "intermediate"}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {project.description || "No description"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(project.tech_stack || []).slice(0, 3).map((tech, i) => (
                        <span key={i} className="px-2 py-1 text-xs rounded border bg-gray-100 text-gray-700">{tech}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <Card className="p-6 bg-white border rounded-md">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              {stats.recentProjects.length === 0 ? (
                <div className="text-sm text-gray-500">No activity yet.</div>
              ) : (
                <div className="space-y-3">
                  {stats.recentProjects.slice(0, 5).map((project, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">
                        {project.title?.charAt(0)?.toUpperCase() || "P"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          New project posted: {project.title || "Untitled Project"}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {project.description || "No description"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white border rounded-md">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => navigate("/projects")}>Join Project</Button>
                <Button variant="outline" onClick={() => navigate("/profile")}>Update Profile</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/ai-pair")}>Find Partner</Button>
                <Button variant="outline" onClick={() => navigate("/resume")}>Resume Builder</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

