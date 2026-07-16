const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderId: String,
  senderName: String,
  text: String,
  replyTo: mongoose.Schema.Types.ObjectId,
  replySenderId: String,
  replySenderName: String,
  replyText: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Chat", chatSchema);
