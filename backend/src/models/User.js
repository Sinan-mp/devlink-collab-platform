const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: false,
      default: "",
    },

    email_verified: {
      type: Boolean,
      default: false,
    },

    email_otp_hash: {
      type: String,
      default: "",
    },

    email_otp_expires: {
      type: Date,
      default: null,
    },

    

    bio: {
      type: String,
      default: "",
    },

    github_username: {
      type: String,
      default: "",
    },

    linkedin_url: {
      type: String,
      default: "",
    },

    github_oauth_connected: {
      type: Boolean,
      default: false,
    },

    experience_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    skills: {
      type: [String],
      default: [],
    },

    interests: {
      type: [String],
      default: [],
    },

    badges: {
      type: [String],
      default: [],
    },

    points: {
      type: Number,
      default: 0,
    },

    level: {
      type: Number,
      default: 1,
    },

    profile_image: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

