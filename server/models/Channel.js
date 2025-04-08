const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["text", "voice"],
    default: "text",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Channel", channelSchema);
