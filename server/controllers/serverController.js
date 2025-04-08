const Server = require("../models/Server");

/**
 * @desc    Create a new server
 * @route   POST /api/servers
 * @access  Private
 */
exports.createServer = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Server name is required" });
    }

    // Create new server
    const server = await Server.create({
      name,
      owner: req.user._id,
      members: [req.user._id], // Add owner as first member
    });

    res.status(201).json(server);
  } catch (error) {
    console.error("Create server error:", error.message);
    res.status(500).json({
      message: "Server error while creating server",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all servers where user is a member
 * @route   GET /api/servers
 * @access  Private
 */
exports.getUserServers = async (req, res) => {
  try {
    // Find all servers where the user is a member
    const servers = await Server.find({
      members: req.user._id,
    }).populate("owner", "username email");

    res.json(servers);
  } catch (error) {
    console.error("Get user servers error:", error.message);
    res.status(500).json({
      message: "Server error while fetching servers",
      error: error.message,
    });
  }
};

/**
 * @desc    Join a server
 * @route   POST /api/servers/:serverId/join
 * @access  Private
 */
exports.joinServer = async (req, res) => {
  try {
    const { serverId } = req.params;

    // Check if server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    // Check if user is already a member
    if (server.members.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this server" });
    }

    // Add user to server members
    server.members.push(req.user._id);
    await server.save();

    res.status(200).json({ message: "Successfully joined server", server });
  } catch (error) {
    console.error("Join server error:", error.message);
    res.status(500).json({
      message: "Server error while joining server",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all servers (that user can join)
 * @route   GET /api/servers/all
 * @access  Private
 */
exports.getAllServers = async (req, res) => {
  try {
    // Find all servers
    const servers = await Server.find({})
      .populate("owner", "username email")
      .select("_id name owner members createdAt");

    // Add a flag to indicate if the current user is a member of each server
    const serversWithMembershipStatus = servers.map((server) => {
      const isMember = server.members.some(
        (member) => member.toString() === req.user._id.toString()
      );

      return {
        _id: server._id,
        name: server.name,
        owner: server.owner,
        memberCount: server.members.length,
        createdAt: server.createdAt,
        isMember,
      };
    });

    res.json(serversWithMembershipStatus);
  } catch (error) {
    console.error("Get all servers error:", error.message);
    res.status(500).json({
      message: "Server error while fetching all servers",
      error: error.message,
    });
  }
};
