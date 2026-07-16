import { useEffect, useState } from "react";
import API from "@/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const withHttps = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const ProfileSetupDialog = ({ user, onComplete }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    const missingGithub = !(user?.github_username || "").trim();
    const missingLinkedin = !(user?.linkedin_url || "").trim();
    const shouldOpen = Boolean(user?.id) && (missingGithub || missingLinkedin);
    setOpen(shouldOpen);
    setGithubUsername(user?.github_username || "");
    setLinkedinUrl(user?.linkedin_url || "");
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        github_username: githubUsername.trim(),
        linkedin_url: withHttps(linkedinUrl),
      };

      const updatedUser = await API.put(`/api/users/${user.id}`, payload);
      const nextUser = { ...user, ...updatedUser };
      localStorage.setItem("devlink_user", JSON.stringify(nextUser));
      onComplete(nextUser);
      setOpen(false);
      toast.success("Profile setup saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save profile setup");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Add your GitHub and LinkedIn so project owners can review your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>GitHub Username</Label>
            <Input
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="octocat"
            />
            <a
              href="https://github.com/signup"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              No GitHub account? Create one
            </a>
          </div>

          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="linkedin.com/in/yourname"
            />
            <a
              href="https://www.linkedin.com/signup"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              No LinkedIn account? Create one
            </a>
          </div>

          <p className="text-xs text-gray-500">
            We can add GitHub OAuth later to fetch repos automatically. For now, username and LinkedIn help owners evaluate requests.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={handleSkip} disabled={saving} className="flex-1">
              Skip For Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupDialog;
