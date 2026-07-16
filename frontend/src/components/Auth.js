import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Users } from "lucide-react";

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    github_username: "",
    linkedin_url: "",
  });
  const hasGoogleClientId = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);

  const parseGoogleCredential = (credential) => {
    try {
      if (!credential) return null;
      const payload = credential.split(".")[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      const decoded = parseGoogleCredential(credential);

      const res = await API.post("/api/auth/google", {
        credential,
        profileImage: decoded?.picture || "",
      });

      localStorage.setItem("devlink_token", res.data.token);
      localStorage.setItem("devlink_user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
      toast.success("Logged in with Google");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Google authentication failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const res = await API.post("/api/auth/login", {
          email: formData.email,
          password: formData.password,
        });

        // ✅ STORE TOKEN & USER (SINGLE SOURCE OF TRUTH)
        localStorage.setItem("devlink_token", res.token);
        localStorage.setItem(
          "devlink_user",
          JSON.stringify(res.user)
        );

        onLogin(res.user);
        toast.success("Welcome back!");
      } else {
        // REGISTER
        const res = await API.post("/api/auth/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          github_username: formData.github_username,
          linkedin_url: formData.linkedin_url,
        });

        const pendingEmail = res.email || formData.email;
        localStorage.setItem("devlink_pending_email", pendingEmail);
        toast.success("Verification code sent. Please verify your email.");
        navigate("/verify-email");
      }
    } catch (err) {
      const message = err?.message || err?.response?.data?.message || "Authentication failed";
      if (message.toLowerCase().includes("email not verified")) {
        localStorage.setItem("devlink_pending_email", formData.email);
        navigate("/verify-email");
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-6xl flex gap-8 items-center">
        {/* LEFT INFO */}
        <div className="hidden lg:flex flex-1 flex-col gap-6">
          <h1 className="text-5xl font-bold">DevLink</h1>
          <p className="text-xl text-gray-600">
            Bridge the gap between learning and job readiness.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI Pair Programmer</h3>
              <p className="text-gray-600">
                Get matched with compatible coding partners
              </p>
            </div>
          </div>
        </div>

        {/* AUTH CARD */}
        <Card className="flex-1 max-w-md p-8">
          <h2 className="text-3xl font-bold mb-2">
            {isLogin ? "Welcome Back" : "Join DevLink"}
          </h2>
          <p className="text-gray-600 mb-6">
            {isLogin
              ? "Login to continue"
              : "Start building your developer career"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            {!isLogin && (
              <div>
                <Label>GitHub Username (Optional)</Label>
                <Input
                  value={formData.github_username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      github_username: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <Label>LinkedIn URL (Optional)</Label>
                <Input
                  value={formData.linkedin_url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      linkedin_url: e.target.value,
                    })
                  }
                  placeholder="https://www.linkedin.com/in/yourname"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Processing..."
                : isLogin
                ? "Login"
                : "Create Account"}
            </Button>
          </form>

          {hasGoogleClientId && (
            <div className="mt-5">
              <div className="my-3 text-center text-sm text-gray-500">or</div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => toast.error("Google login popup failed")}
                  useOneTap
                />
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-purple-600"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
