const Channel = require("../models/Channel");
const Server = require("../models/Server");
const Message = require("../models/Message");

// Create a new channel
const createChannel = async (req, res) => {
  try {
    const { name } = req.body;
    const serverId = req.params.serverId;

    if (!name) {
      return res.status(400).json({ message: "Channel name is required" });
    }

    // Verify server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    // Verify user is a member of the server
    if (!server.members.includes(req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this server" });
    }

    const channel = await Channel.create({
      name,
      server: serverId,
      type: req.body.type || "text",
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error("Error creating channel:", error);
    res
      .status(500)
      .json({ message: "Error creating channel", error: error.message });
  }
};

// Get all channels for a server
const getServerChannels = async (req, res) => {
  try {
    const serverId = req.params.serverId;

    // Verify server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    // Verify user is a member of the server
    if (!server.members.includes(req.user.id)) {
      return res
        .status(403)
        .json({ message: "You are not a member of this server" });
    }

    const channels = await Channel.find({ server: serverId });
    res.status(200).json(channels);
  } catch (error) {
    console.error("Error getting server channels:", error);
    res
      .status(500)
      .json({ message: "Error getting server channels", error: error.message });
  }
};

// Get messages for a specific channel
const getChannelMessages = async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const limit = parseInt(req.query.limit) || 50; // Default to 50 messages

    console.log(
      `Getting messages for channel: ${channelId}, limit: ${limit}, user: ${req.user?._id}`
    );

    // Verify channel exists and get server info
    const channel = await Channel.findById(channelId);
    if (!channel) {
      console.log(`Channel not found: ${channelId}`);
      return res.status(404).json({ message: "Channel not found" });
    }

    console.log(`Channel found: ${channel._id}, server: ${channel.server}`);

    // Get server to verify membership
    const server = await Server.findById(channel.server);
    if (!server) {
      console.log(`Server not found: ${channel.server}`);
      return res.status(404).json({ message: "Server not found" });
    }

    console.log(`Server found: ${server._id}, member IDs: ${server.members}`);

    // Verify user is a member of the server
    if (!server.members.includes(req.user.id)) {
      console.log(
        `User ${req.user.id} is not a member of server ${server._id}`
      );
      return res
        .status(403)
        .json({ message: "You are not a member of this server" });
    }

    console.log(
      `User ${req.user.id} is a member of server ${server._id}, fetching messages`
    );

    // Fetch messages for the channel
    const messages = await Message.find({ channel: channelId })
      .sort({ timestamp: -1 }) // Newest first
      .limit(limit)
      .populate("sender", "username") // Include sender username
      .lean(); // Convert to plain JavaScript objects for better performance

    console.log(`Found ${messages.length} messages for channel ${channelId}`);

    // Return messages in chronological order (oldest first)
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error getting channel messages:", error);
    res.status(500).json({
      message: "Error getting channel messages",
      error: error.message,
    });
  }
};

module.exports = {
  createChannel,
  getServerChannels,
  getChannelMessages,
};
