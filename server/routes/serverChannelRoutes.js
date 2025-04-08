const express = require("express");
const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/authMiddleware");
const {
  createChannel,
  getServerChannels,
} = require("../controllers/channelController");

// POST /api/servers/:serverId/channels
router.post("/", protect, createChannel);

// GET /api/servers/:serverId/channels
router.get("/", protect, getServerChannels);

module.exports = router;
