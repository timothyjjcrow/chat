const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ServerSchema = new Schema({
  name: {
    type: String,
    required: [true, "Server name is required"],
    trim: true,
    maxlength: [50, "Server name cannot be more than 50 characters"],
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Server owner is required"],
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Server", ServerSchema);
