import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const JoinRequests = ({ user, onLogout }) => {

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequester, setSelectedRequester] = useState(null);
  const [allProjects, setAllProjects] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchRequests();
  }, [user]);

  // FETCH REQUESTS
  const fetchRequests = async () => {
    try {
      const [reqRes, projectRes] = await Promise.all([
        axios.get(`${API}/projects/join-requests?owner_id=${user?.id}`),
        axios.get(`${API}/projects`),
      ]);

      // newest first
      setRequests((reqRes.data || []).reverse());
      setAllProjects(projectRes.data || []);

    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  // APPROVE
  const approveRequest = async (id) => {
    try {
      await axios.post(`${API}/projects/join-requests/${id}/approve`);

      toast.success("Request approved!");

      setRequests(prev =>
        prev.map(r =>
          r._id === id ? { ...r, status: "approved" } : r
        )
      );

    } catch {
      toast.error("Failed to approve request");
    }
  };

  // REJECT
  const rejectRequest = async (id) => {
    try {
      await axios.post(`${API}/projects/join-requests/${id}/reject`);

      toast.success("Request rejected!");

      setRequests(prev =>
        prev.map(r =>
          r._id === id ? { ...r, status: "rejected" } : r
        )
      );

    } catch {
      toast.error("Failed to reject request");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">

      <Navbar user={user} onLogout={onLogout} />

      <div className="max-w-5xl mx-auto px-4 py-10">

        <h1 className="text-3xl font-bold mb-8 text-center">
          Join Requests
        </h1>

        {loading && (
          <p className="text-center text-gray-500">Loading...</p>
        )}

        {!loading && requests.length === 0 && (
          <p className="text-center text-gray-400">
            No join requests yet
          </p>
        )}

        <div className="space-y-4">

          {requests.map(req => (

            <Card
              key={req._id}
              className="p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:shadow-lg transition"
            >

              <div>
                <p className="text-sm text-gray-500">Requester</p>

                <p className="font-semibold text-lg">
                  {req.requester_id?.name || "Unknown User"}
                </p>
                <p className="text-sm text-gray-600">
                  {req.requester_id?.email || "No email available"}
                </p>
                {req.project_id?.title && (
                  <p className="text-sm text-gray-500 mt-1">
                    Project: {req.project_id.title}
                  </p>
                )}

                <p className="text-xs text-gray-400 mt-1">
                  {new Date(req.createdAt).toLocaleString()}
                </p>

                <span
                  className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${req.status === "approved"
                      ? "bg-green-100 text-green-600"
                      : req.status === "rejected"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                >
                  {req.status.toUpperCase()}
                </span>
              </div>

              <div className="flex gap-3 mt-4 sm:mt-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequester(req.requester_id || null)}
                >
                  View Profile
                </Button>

                {req.status === "pending" && (
                  <>
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white px-5"
                      onClick={() => approveRequest(req._id)}
                    >
                      Approve
                    </Button>

                    <Button
                      className="bg-red-500 hover:bg-red-600 text-white px-5"
                      onClick={() => rejectRequest(req._id)}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {req.status === "approved" && (
                  <span className="text-green-600 font-semibold">
                    Approved ✓
                  </span>
                )}

                {req.status === "rejected" && (
                  <span className="text-red-600 font-semibold">
                    Rejected ✗
                  </span>
                )}

              </div>

            </Card>

          ))}

        </div>

      </div>

      <Dialog
        open={Boolean(selectedRequester)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedRequester(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Requester Profile</DialogTitle>
            <DialogDescription>
              Check this user&apos;s profile before approving the join request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequester && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {selectedRequester.profile_image && (
                    <AvatarImage
                      src={selectedRequester.profile_image}
                      alt={selectedRequester.name}
                    />
                  )}
                  <AvatarFallback>
                    {(selectedRequester.name || "U")[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedRequester.name || "Unknown User"}</p>
                  <p className="text-sm text-gray-600">{selectedRequester.email || "No email"}</p>
                </div>
              </div>

              <p className="text-sm text-gray-700">
                <span className="font-medium">Experience:</span>{" "}
                {selectedRequester.experience_level || "Not provided"}
              </p>

              <p className="text-sm text-gray-700">
                <span className="font-medium">Bio:</span>{" "}
                {selectedRequester.bio || "No bio added"}
              </p>

              <div className="flex flex-wrap gap-2">
                {(selectedRequester.skills || []).length > 0 && (
                  <p className="w-full text-sm font-medium text-gray-700">Skills</p>
                )}
                {(selectedRequester.skills || []).map((skill, idx) => (
                  <span key={idx} className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {(selectedRequester.interests || []).length > 0 && (
                  <p className="w-full text-sm font-medium text-gray-700">Interests</p>
                )}
                {(selectedRequester.interests || []).map((interest, idx) => (
                  <span key={idx} className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                    {interest}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Ongoing Projects (
                    {
                      allProjects.filter(
                        (p) =>
                          p.status === "open" &&
                          (p.team_members || []).some(
                            (m) =>
                              String(m?._id || m) === String(selectedRequester._id || selectedRequester.id)
                          )
                      ).length
                    }
                    )
                  </p>
                  <div className="space-y-1 max-h-28 overflow-auto">
                    {allProjects
                      .filter(
                        (p) =>
                          p.status === "open" &&
                          (p.team_members || []).some(
                            (m) =>
                              String(m?._id || m) === String(selectedRequester._id || selectedRequester.id)
                          )
                      )
                      .map((p) => (
                        <p key={p._id} className="text-xs bg-gray-50 border rounded px-2 py-1">
                          {p.title}
                        </p>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Completed Projects (
                    {
                      allProjects.filter(
                        (p) =>
                          p.status === "closed" &&
                          (p.team_members || []).some(
                            (m) =>
                              String(m?._id || m) === String(selectedRequester._id || selectedRequester.id)
                          )
                      ).length
                    }
                    )
                  </p>
                  <div className="space-y-1 max-h-28 overflow-auto">
                    {allProjects
                      .filter(
                        (p) =>
                          p.status === "closed" &&
                          (p.team_members || []).some(
                            (m) =>
                              String(m?._id || m) === String(selectedRequester._id || selectedRequester.id)
                          )
                      )
                      .map((p) => (
                        <p key={p._id} className="text-xs bg-green-50 border rounded px-2 py-1">
                          {p.title}
                        </p>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedRequester.github_username ? (
                  <a
                    href={`https://github.com/${selectedRequester.github_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    GitHub: @{selectedRequester.github_username}
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">GitHub not provided</span>
                )}

                {selectedRequester.linkedin_url ? (
                  <a
                    href={selectedRequester.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">LinkedIn not provided</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JoinRequests;
