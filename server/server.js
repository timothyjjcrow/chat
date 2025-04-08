const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// Import models
const Message = require("./models/Message");

// Track users in channels
const channelPresence = {};
const usernames = new Map(); // Store username by userId
const lastChannelJoin = new Map(); // Track last join time for rate limiting
const socketToUserMap = new Map(); // Track which socket belongs to which user
const userSessionsMap = new Map(); // Track which sessions belong to which user

// Import routes
const authRoutes = require("./routes/authRoutes");
const serverRoutes = require("./routes/serverRoutes");
const channelRoutes = require("./routes/channelRoutes");
const serverChannelRoutes = require("./routes/serverChannelRoutes");

// Load environment variables
dotenv.config();

// Connect to MongoDB with improved error handling
console.log("Attempting to connect to MongoDB...");
console.log(
  "MONGO_URI:",
  process.env.MONGO_URI ? "MONGO_URI is set" : "MONGO_URI is not set"
);
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB:", err.message);
  // Don't exit process yet to see logs
});

// Create Express app
const app = express();
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3030",
      process.env.CLIENT_URL,
    ],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3030",
      process.env.CLIENT_URL,
    ],
    credentials: true,
  })
);
app.use(express.json());

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "API Running" });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/channels", channelRoutes);

// Socket.IO connection handling
io.on("connection", (socket) => {
  const { userId, username, token, sessionId } = socket.handshake.auth;
  const querySessionId = socket.handshake.query.sessionId; // Backup session ID from query
  const effectiveSessionId = sessionId || querySessionId || "unknown-session";

  // Store the user info on the socket for later reference
  socket.userId = userId;
  socket.username = username;
  socket.sessionId = effectiveSessionId;

  // Map this socket to the user ID
  if (userId) {
    socketToUserMap.set(socket.id, { userId, sessionId: effectiveSessionId });

    // Track this session for this user
    if (!userSessionsMap.has(userId)) {
      userSessionsMap.set(userId, new Set());
    }
    userSessionsMap.get(userId).add(effectiveSessionId);
  }

  console.log(
    `User connected: ${socket.id} (${username}, ${userId}, session: ${effectiveSessionId})`
  );

  // Handle joining a channel
  socket.on("joinChannel", ({ channelId, userId, username, sessionId }) => {
    // Verify this is the same user that connected
    if (socket.userId !== userId) {
      console.warn(
        `Socket ${socket.id} tried to join as different user (${userId} vs ${socket.userId})`
      );
      return;
    }

    // Verify session if provided
    if (sessionId && socket.sessionId !== sessionId) {
      console.warn(
        `Socket ${socket.id} tried to join with different session (${sessionId} vs ${socket.sessionId})`
      );
      return;
    }

    // Rate limiting - prevent too many join requests in a short time
    const now = Date.now();
    const lastJoin = lastChannelJoin.get(userId) || 0;

    // Only allow one join every 500ms per user
    if (now - lastJoin < 500) {
      console.log(
        `Rate limited channel join for user ${username} (${userId}), session: ${socket.sessionId}`
      );
      return;
    }

    // Update last join time
    lastChannelJoin.set(userId, now);

    // Store username globally for easy lookup
    usernames.set(userId, username);

    // Leave previous channel if exists
    if (socket.currentChannel) {
      socket.leave(socket.currentChannel);
      console.log(
        `User ${socket.id} (${username}) left channel: ${socket.currentChannel}, session: ${socket.sessionId}`
      );

      // Remove user from previous channel's presence
      if (channelPresence[socket.currentChannel]) {
        channelPresence[socket.currentChannel].delete(userId);

        // If no users left in channel, delete the Set
        if (channelPresence[socket.currentChannel].size === 0) {
          delete channelPresence[socket.currentChannel];
        } else {
          // Notify remaining users about presence update
          const userList = Array.from(
            channelPresence[socket.currentChannel]
          ).map((id) => {
            return { userId: id, username: usernames.get(id) || "Unknown" };
          });
          io.to(socket.currentChannel).emit("updatePresence", userList);
        }
      }
    }

    // Join new channel
    socket.join(channelId);
    socket.currentChannel = channelId; // Store the current channel on the socket

    console.log(
      `User ${socket.id} (${username}) joined channel: ${channelId}, session: ${socket.sessionId}`
    );

    // Add user to channel presence
    if (!channelPresence[channelId]) {
      channelPresence[channelId] = new Set();
    }
    channelPresence[channelId].add(userId);

    // Emit updated presence list to everyone in the channel
    const userList = Array.from(channelPresence[channelId]).map((id) => {
      return { userId: id, username: usernames.get(id) || "Unknown" };
    });
    io.to(channelId).emit("updatePresence", userList);

    // Acknowledge that the user joined the channel
    socket.emit("channelJoined", { channelId });
  });

  // Handle leaving a channel (explicit leave when switching channels)
  socket.on("leaveChannel", ({ channelId, sessionId }) => {
    // Verify session if provided
    if (sessionId && socket.sessionId !== sessionId) {
      console.warn(
        `Socket ${socket.id} tried to leave with different session (${sessionId} vs ${socket.sessionId})`
      );
      return;
    }

    if (socket.currentChannel) {
      socket.leave(socket.currentChannel);
      console.log(
        `User ${socket.id} left channel: ${socket.currentChannel}, session: ${socket.sessionId}`
      );

      // Check if this user has other active connections in this channel
      const hasOtherConnectionsInChannel = Array.from(
        io.sockets.sockets.values()
      ).some(
        (s) =>
          s.id !== socket.id &&
          s.userId === socket.userId &&
          s.currentChannel === socket.currentChannel
      );

      // Only remove from presence if no other connections from same user in same channel
      if (!hasOtherConnectionsInChannel) {
        // Remove user from channel's presence
        if (channelPresence[socket.currentChannel] && socket.userId) {
          channelPresence[socket.currentChannel].delete(socket.userId);

          // If no users left in channel, delete the Set
          if (channelPresence[socket.currentChannel].size === 0) {
            delete channelPresence[socket.currentChannel];
          } else {
            // Notify remaining users about presence update
            const userList = Array.from(
              channelPresence[socket.currentChannel]
            ).map((id) => {
              return { userId: id, username: usernames.get(id) || "Unknown" };
            });
            io.to(socket.currentChannel).emit("updatePresence", userList);
          }
        }
      } else {
        console.log(
          `User ${socket.userId} has other connections in channel ${socket.currentChannel} - keeping in presence list`
        );
      }

      socket.currentChannel = null;
    }
  });

  // Handle chat messages
  socket.on("sendMessage", async (message) => {
    console.log("Message received:", message);

    // Check if user is in a channel
    if (!socket.currentChannel) {
      console.warn("User not in a channel, message not sent");
      return;
    }

    try {
      // Create a new message document in MongoDB
      const newMessage = new Message({
        channel: socket.currentChannel,
        sender: socket.userId,
        content: message.text,
        timestamp: new Date(),
      });

      // Save the message to the database
      await newMessage.save();
      console.log("Message saved to database:", newMessage._id);

      // Send the message only to users in the same channel
      io.to(socket.currentChannel).emit("receiveMessage", {
        ...message,
        timestamp: newMessage.timestamp.toISOString(),
        _id: newMessage._id.toString(), // Include the database ID
      });
    } catch (error) {
      console.error("Error saving message to database:", error);

      // Notify the sender about the error
      socket.emit("messageError", {
        error: "Failed to save message",
        originalMessage: message,
      });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log(
      `User disconnected: ${socket.id}, session: ${socket.sessionId}`
    );

    // Remove the socket from the user map
    if (socketToUserMap.has(socket.id)) {
      const { userId, sessionId } = socketToUserMap.get(socket.id);
      socketToUserMap.delete(socket.id);

      // Remove this session from the user's sessions
      if (userSessionsMap.has(userId)) {
        userSessionsMap.get(userId).delete(sessionId);

        // If user has no more sessions, clean up the entry
        if (userSessionsMap.get(userId).size === 0) {
          userSessionsMap.delete(userId);
        }
      }
    }

    // Check if this user has other active connections in this channel
    let hasOtherConnectionsInChannel = false;

    if (socket.currentChannel && socket.userId) {
      hasOtherConnectionsInChannel = Array.from(
        io.sockets.sockets.values()
      ).some(
        (s) =>
          s.id !== socket.id &&
          s.userId === socket.userId &&
          s.currentChannel === socket.currentChannel
      );
    }

    // Remove user from channel presence if they were in a channel
    if (
      socket.currentChannel &&
      channelPresence[socket.currentChannel] &&
      socket.userId &&
      !hasOtherConnectionsInChannel
    ) {
      console.log(
        `Removing user ${socket.userId} from channel presence (no other connections in this channel)`
      );
      channelPresence[socket.currentChannel].delete(socket.userId);

      // If no users left in channel, delete the Set
      if (channelPresence[socket.currentChannel].size === 0) {
        delete channelPresence[socket.currentChannel];
      } else {
        // Notify remaining users about presence update
        const userList = Array.from(channelPresence[socket.currentChannel]).map(
          (id) => {
            return { userId: id, username: usernames.get(id) || "Unknown" };
          }
        );
        io.to(socket.currentChannel).emit("updatePresence", userList);
      }
    } else if (socket.currentChannel && socket.userId) {
      console.log(
        `User ${socket.userId} has other connections in channel ${socket.currentChannel} - keeping in presence list`
      );
    }
    // Socket.IO automatically handles removing the socket from all rooms
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});
