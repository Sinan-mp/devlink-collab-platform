const mongoose = require('mongoose');
const Project = require("../models/Project");


const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    tech_stack: {
      type: [String],
      default: []
    },
    required_skills: {
      type: [String],
      default: []
    },
    team_size: {
      type: Number,
      required: true
    },
    team_members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },

    join_requests: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },


    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    githubRepo: {
      type: String,
      default: ""
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Project || mongoose.model("Project", projectSchema);

