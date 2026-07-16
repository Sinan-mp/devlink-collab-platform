import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const VerifyEmail = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem("devlink_pending_email");
    if (pending) setEmail(pending);
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/api/auth/verify-otp", {
        email,
        otp,
      });

      localStorage.removeItem("devlink_pending_email");
      localStorage.setItem("devlink_token", res.token);
      localStorage.setItem("devlink_user", JSON.stringify(res.user));
      onLogin(res.user);
      toast.success("Email verified");
      navigate("/");
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return toast.error("Enter your email");
    setSending(true);
    try {
      await API.post("/api/auth/request-otp", { email });
      toast.success("Verification code sent");
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-md p-8">
        <h2 className="text-3xl font-bold mb-2">Verify Your Email</h2>
        <p className="text-gray-600 mb-6">
          Enter the 6-digit code we sent to your email.
        </p>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Verification Code</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-sm text-purple-600"
            type="button"
          >
            {sending ? "Sending..." : "Resend code"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmail;
