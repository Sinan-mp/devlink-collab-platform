const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const { sendOtpEmail } = require("../utils/email");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 10;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const setEmailOtp = async (user) => {
  const otp = generateOtp();
  user.email_otp_hash = hashOtp(otp);
  user.email_otp_expires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await user.save();
  return otp;
};

// Helper: format user object consistently
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  email_verified: Boolean(user.email_verified),

  // Profile fields
  bio: user.bio || "",
  github_username: user.github_username || "",
  linkedin_url: user.linkedin_url || "",
  github_oauth_connected: Boolean(user.github_oauth_connected),
  experience_level: user.experience_level || "beginner",

  skills: user.skills || [],
  interests: user.interests || [],
  badges: user.badges || [],

  points: user.points || 0,
  level: user.level || 1,

  profile_image: user.profile_image || "",
});


// ==============================
// REGISTER USER
// ==============================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, github_username, linkedin_url } = req.body;

    // Check if user exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      // safe defaults
      bio: "",
      github_username: github_username || "",
      linkedin_url: linkedin_url || "",
      github_oauth_connected: false,
      experience_level: "beginner",
      skills: [],
      interests: [],
      badges: [],
      points: 0,
      level: 1,
      profile_image: "",
      email_verified: false,
    });

    const otp = await setEmailOtp(newUser);
    const emailRes = await sendOtpEmail({
      to: newUser.email,
      otp,
      ttlMinutes: OTP_TTL_MINUTES,
    });

    if (!emailRes.sent) {
      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    return res.status(201).json({
      message: "Registration successful. Verification code sent.",
      email: newUser.email,
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ==============================
// LOGIN USER
// ==============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "User not found" });

    if (!user.password) {
      return res.status(400).json({ message: "Use Google sign-in for this account" });
    }

    if (!user.email_verified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: formatUser(user),
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ==============================
// GOOGLE LOGIN / REGISTER
// ==============================
router.post("/google", async (req, res) => {
  try {
    const { credential, profileImage: fallbackProfileImage } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google auth is not configured" });
    }

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ message: "Invalid Google account data" });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];
    const profileImage = payload.picture || fallbackProfileImage || "";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: "",
        bio: "",
        github_username: "",
        linkedin_url: "",
        github_oauth_connected: false,
        experience_level: "beginner",
        skills: [],
        interests: [],
        badges: [],
        points: 0,
        level: 1,
        profile_image: profileImage,
        email_verified: true,
      });
    } 

    if (!user.email_verified || (profileImage && user.profile_image !== profileImage)) {
      if (profileImage && user.profile_image !== profileImage) {
        user.profile_image = profileImage;
      }
      user.email_verified = true;
      user.email_otp_hash = "";
      user.email_otp_expires = null;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Google login successful",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return res.status(500).json({ message: "Google authentication failed" });
  }
});

// ==============================
// REQUEST EMAIL OTP
// ==============================
router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email_verified) {
      return res.json({ message: "Email already verified" });
    }

    const otp = await setEmailOtp(user);
    const emailRes = await sendOtpEmail({
      to: user.email,
      otp,
      ttlMinutes: OTP_TTL_MINUTES,
    });

    if (!emailRes.sent) {
      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    return res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("REQUEST OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ==============================
// VERIFY EMAIL OTP
// ==============================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email_verified) {
      return res.json({ message: "Email already verified" });
    }

    if (!user.email_otp_hash || !user.email_otp_expires) {
      return res.status(400).json({ message: "No active OTP. Request a new one." });
    }

    if (user.email_otp_expires < new Date()) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }

    const isMatch = hashOtp(String(otp)) === user.email_otp_hash;
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.email_verified = true;
    user.email_otp_hash = "";
    user.email_otp_expires = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Email verified",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
