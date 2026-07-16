const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },

    requester_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
