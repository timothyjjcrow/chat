const express = require("express");
const router = express.Router();
const {
  createServer,
  getUserServers,
  joinServer,
  getAllServers,
} = require("../controllers/serverController");
const { protect } = require("../middleware/authMiddleware");

// Import channel routes
const serverChannelRoutes = require("./serverChannelRoutes");

// Protected routes - require authentication
router.use(protect);

// Create a new server
router.post("/", createServer);

// Get all servers for the user
router.get("/", getUserServers);

// Get all servers in the system
router.get("/all", getAllServers);

// Join a server
router.post("/:serverId/join", joinServer);

// Mount channel routes
router.use("/:serverId/channels", serverChannelRoutes);

module.exports = router;
