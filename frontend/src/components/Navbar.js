import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from "axios";
import { toast } from "sonner";

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Home, FolderGit2, Users, FileText, LogOut, User, Menu, X, Bell, Github, ExternalLink } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {

  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  const [previewOwner, setPreviewOwner] = useState(null);
  const [previewOwnerProjects, setPreviewOwnerProjects] = useState([]);
  const [ownerProfileOpen, setOwnerProfileOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  const API = `${BACKEND_URL}/api`;

  // =====================
  // FETCH JOIN REQUEST COUNT
  // =====================
  useEffect(() => {

    if (!user?.id) return;

    const fetchRequests = async () => {
      try {
        const res = await axios.get(
          `${API}/join-requests?owner_id=${user.id}`
        );

        const pending = res.data.filter(r => r.status === "pending");
        setRequestCount(pending.length);

      } catch (err) {
        console.log(err);
      }
    };

    fetchRequests();

    const interval = setInterval(fetchRequests, 5000);

    return () => clearInterval(interval);

  }, [user]);

  // =====================
  // FETCH NOTIFICATIONS
  // =====================
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(
          `${API}/notifications?user_id=${user.id}`
        );
        const items = res.data || [];
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read).length);
      } catch (err) {
        console.log(err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user, API]);

  const openProjectPreview = async (notification) => {
    if (!notification?.projectId) return;
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewProject(null);
    setPreviewOwner(null);
    setPreviewOwnerProjects([]);
    try {
      await axios.put(`${API}/notifications/${notification._id}/read`);
    } catch {
      // ignore
    }

    try {
      const project = await axios.get(`${API}/projects/${notification.projectId}`);
      setPreviewProject(project.data || project);
      const ownerId = project?.data?.creator_id || project?.creator_id;
      if (ownerId) {
        const [owner, allProjects] = await Promise.all([
          axios.get(`${API}/users/${ownerId}`),
          axios.get(`${API}/projects`),
        ]);
        const ownerData = owner.data || owner;
        setPreviewOwner(ownerData);
        const ownerProjects = (allProjects.data || []).filter((p) =>
          (p.team_members || []).some((m) => String(m?._id || m) === String(ownerId))
        );
        setPreviewOwnerProjects(ownerProjects);
      }
    } catch (err) {
      toast.error("Failed to load project preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!previewProject?._id) return;
    try {
      await axios.post(`${API}/projects/${previewProject._id}/request-join`, {
        user_id: user?.id,
      });
      toast.success("Join request sent");
      setPreviewOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send join request");
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'AI Pair', path: '/ai-pair', icon: Users },
    { name: 'Resume', path: '/resume', icon: FileText }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b sticky top-0 z-50">

      <div className="max-w-7xl mx-auto px-4">

        <div className="flex justify-between items-center h-16">

          {/* LOGO */}
          <h1
            onClick={() => navigate('/')}
            className="text-xl font-semibold cursor-pointer text-gray-900"
          >
            DevLink
          </h1>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex space-x-2">

            {navItems.map(item => {
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4"/>
                  {item.name}
                </button>
              );
            })}

            {/* NOTIFICATIONS */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2">
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-gray-500">Recent invites and updates</p>
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 && (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    No notifications yet
                  </div>
                )}
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n._id}
                    onClick={() => openProjectPreview(n)}
                    className={`flex flex-col items-start gap-1 ${n.read ? "" : "bg-gray-100"}`}
                  >
                    <span className="text-sm">{n.message}</span>
                    <span className="text-xs text-gray-500">
                      {n.fromUserName ? `From ${n.fromUserName}` : "View project"}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* JOIN REQUEST BUTTON */}
            <button
              onClick={() => navigate("/join-requests")}
              className="relative px-4 py-2 font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Join Requests

              {requestCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
                  {requestCount}
                </span>
              )}
            </button>

          </div>

          {/* USER MENU */}
          <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full">
                <Avatar>
                  {user.profile_image && (
                    <AvatarImage src={user.profile_image} alt={user.name} />
                  )}
                  <AvatarFallback>
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">

              <div className="px-2 py-2">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4"/> Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4"/> Logout
              </DropdownMenuItem>

            </DropdownMenuContent>

          </DropdownMenu>

          {/* MOBILE BUTTON */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X/> : <Menu/>}
          </button>

        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">

            {navItems.map(item => {
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full gap-2 px-4 py-2 hover:bg-gray-100"
                >
                  <Icon className="w-5 h-5"/>
                  {item.name}
                </button>
              );
            })}

            <button
              onClick={() => navigate("/join-requests")}
              className="relative px-4 py-2 font-medium"
            >
              Join Requests

              {requestCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
                  {requestCount}
                </span>
              )}
            </button>

            <div className="px-4 pt-3 border-t">
              <p className="text-sm font-medium mb-2">Notifications</p>
              {notifications.length === 0 && (
                <p className="text-sm text-gray-500">No notifications yet</p>
              )}
              {notifications.slice(0, 5).map((n) => (
                <button
                  key={n._id}
                  onClick={() => {
                    openProjectPreview(n);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-sm py-2"
                >
                  {n.message}
                </button>
              ))}
            </div>

          </div>
        )}

      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Project Invite</DialogTitle>
            <DialogDescription>
              Review project details before joining.
            </DialogDescription>
          </DialogHeader>

          {previewLoading && (
            <div className="text-sm text-gray-500">Loading...</div>
          )}

          {!previewLoading && previewProject && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{previewProject.title}</h3>
                <p className="text-sm text-gray-600">{previewProject.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(previewProject.tech_stack || []).map((tech, i) => (
                  <span key={i} className="px-2 py-1 text-xs rounded border bg-gray-100 text-gray-700">
                    {tech}
                  </span>
                ))}
              </div>

              <div className="text-sm text-gray-600">
                Team size: {(previewProject.team_members || []).length}/{previewProject.team_size}
              </div>

              {previewOwner && (
                <div className="p-3 rounded border bg-gray-50 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{previewOwner.name || "Project Owner"}</p>
                    <p className="text-xs text-gray-500">{previewOwner.email || "No email"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setOwnerProfileOpen(true)}>
                    View Profile
                  </Button>
                </div>
              )}

              {(() => {
                const isFull =
                  (previewProject.team_members || []).length >=
                  (previewProject.team_size || 0);
                if (!isFull) return null;
                return (
                  <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
                    Project full. Contact the owner to request a spot.
                  </div>
                );
              })()}

              <div className="flex gap-2">
                {(() => {
                  const isFull =
                    (previewProject.team_members || []).length >=
                    (previewProject.team_size || 0);
                  if (isFull) {
                    return (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          if (previewOwner?.email) {
                            window.open(`mailto:${previewOwner.email}`, "_blank");
                          } else {
                            toast.error("Owner email not available");
                          }
                        }}
                      >
                        Contact Owner
                      </Button>
                    );
                  }
                  return (
                    <Button className="flex-1" onClick={handleJoinRequest}>
                      Join Project
                    </Button>
                  );
                })()}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={ownerProfileOpen} onOpenChange={setOwnerProfileOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Owner Profile</DialogTitle>
            <DialogDescription>
              Review owner profile and project history before joining.
            </DialogDescription>
          </DialogHeader>

          {!previewOwner ? (
            <p className="text-sm text-gray-500">Profile unavailable</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{previewOwner.name}</h3>
                  <p className="text-sm text-gray-500">{previewOwner.email}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                  {previewOwner.experience_level || "beginner"}
                </span>
              </div>

              {previewOwner.bio && (
                <div>
                  <p className="text-sm font-medium mb-1">Bio</p>
                  <p className="text-sm text-gray-700">{previewOwner.bio}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(previewOwner.skills || []).length > 0 ? (
                      (previewOwner.skills || []).map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No skills listed</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {(previewOwner.interests || []).length > 0 ? (
                      (previewOwner.interests || []).map((interest, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No interests listed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {previewOwner.github_username && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://github.com/${previewOwner.github_username}`, "_blank")}
                  >
                    <Github className="w-4 h-4 mr-1" />
                    GitHub
                  </Button>
                )}
                {previewOwner.linkedin_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewOwner.linkedin_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    LinkedIn
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">
                    Ongoing Projects ({previewOwnerProjects.filter((p) => p.status === "open").length})
                  </p>
                  <div className="space-y-2 max-h-36 overflow-auto pr-1">
                    {previewOwnerProjects
                      .filter((p) => p.status === "open")
                      .map((p) => (
                        <div key={p._id} className="text-xs border rounded p-2 bg-gray-50">
                          <p className="font-medium">{p.title}</p>
                          <p className="text-gray-500">
                            {(p.team_members || []).length}/{p.team_size} members
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">
                    Completed Projects ({previewOwnerProjects.filter((p) => p.status === "closed").length})
                  </p>
                  <div className="space-y-2 max-h-36 overflow-auto pr-1">
                    {previewOwnerProjects
                      .filter((p) => p.status === "closed")
                      .map((p) => (
                        <div key={p._id} className="text-xs border rounded p-2 bg-green-50">
                          <p className="font-medium">{p.title}</p>
                          <p className="text-gray-500">
                            {(p.team_members || []).length}/{p.team_size} members
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;

