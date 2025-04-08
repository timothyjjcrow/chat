const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getChannelMessages } = require("../controllers/channelController");

// Debug middleware for this route
router.use((req, res, next) => {
  console.log(
    `Channel route accessed: ${req.method} ${
      req.originalUrl
    } (params: ${JSON.stringify(req.params)})`
  );
  next();
});

// GET /api/channels/:channelId/messages
router.get("/:channelId/messages", protect, getChannelMessages);

module.exports = router;
