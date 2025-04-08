import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

// Create the context
const SocketContext = createContext();

// Hook to use the socket context
const useSocket = () => {
  return useContext(SocketContext);
};

// Provider component
const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState(null);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const { isAuthenticated, user, token, sessionId } = useAuth();
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const lastChannelRef = useRef(null); // Track the last joined channel for reconnection

  // Memoize the joinChannel function to prevent unnecessary re-renders
  const joinChannel = useCallback(
    (channelId) => {
      if (!socketRef.current || !connected) {
        console.log(
          `Can't join channel ${channelId}, socket not ready. Saving for later.`
        );
        lastChannelRef.current = channelId; // Save channel ID even if we can't join yet
        return;
      }

      // Prevent joining the same channel repeatedly
      if (currentChannelId === channelId) {
        console.log(`Already in channel ${channelId}, skipping join request`);
        return;
      }

      // If already in a channel, leave it first
      if (currentChannelId && currentChannelId !== channelId) {
        socketRef.current.emit("leaveChannel", { channelId: currentChannelId });
      }

      console.log(`Joining channel ${channelId} for session: ${sessionId}`);
      lastChannelRef.current = channelId; // Save the channel ID

      // Join the new channel
      socketRef.current.emit("joinChannel", {
        channelId,
        userId: user?._id,
        username: user?.username,
        sessionId: sessionId, // Send session ID with join request
      });
    },
    [connected, currentChannelId, sessionId, user]
  );

  // Function to leave a channel
  const leaveChannel = useCallback(() => {
    if (!socketRef.current || !connected || !currentChannelId) return;

    socketRef.current.emit("leaveChannel", {
      channelId: currentChannelId,
      sessionId: sessionId, // Send session ID with leave request
    });
    setCurrentChannelId(null);
    setPresenceUsers([]);
  }, [connected, currentChannelId, sessionId]);

  // Set up socket connection and event listeners
  useEffect(() => {
    // Only connect to socket if user is authenticated and has a token
    if (isAuthenticated && user && token) {
      console.log(
        "Creating new socket connection for user:",
        user.username,
        "session:",
        sessionId
      );

      // Check if someone was logged out in this session
      const wasLoggedOut = sessionStorage.getItem("loggedOut") === "true";

      if (wasLoggedOut) {
        console.log("This session was previously logged out, clearing flag");
        sessionStorage.removeItem("loggedOut");
      }

      // Create socket connection with authentication
      const newSocket = io(
        import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
        {
          auth: {
            userId: user._id,
            username: user.username,
            token: token,
            sessionId: sessionId, // Send session ID to server for better tracking
          },
          // Add these options to prevent socket reuse between users
          transports: ["websocket"],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 10, // Increase reconnection attempts
          reconnectionDelay: 3000, // Increase delay between reconnection attempts
          timeout: 20000, // Longer timeout
          query: {
            sessionId: sessionId, // Add as query param too for extra clarity
          },
        }
      );

      // Store socket reference
      socketRef.current = newSocket;

      // Handle socket connection events
      newSocket.on("connect", () => {
        console.log(
          "Socket connected:",
          newSocket.id,
          "for session:",
          sessionId
        );
        socketIdRef.current = newSocket.id;
        setConnected(true);

        // If we have a saved channel, try to rejoin it on reconnection
        if (lastChannelRef.current) {
          console.log(
            "Attempting to rejoin last channel:",
            lastChannelRef.current
          );
          setTimeout(() => {
            newSocket.emit("joinChannel", {
              channelId: lastChannelRef.current,
              userId: user._id,
              username: user.username,
              sessionId: sessionId,
            });
          }, 1000); // Small delay to ensure connection is fully established
        }
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason, "for session:", sessionId);
        setConnected(false);
        // Do not clear currentChannelId on disconnect to preserve it for reconnection
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
        setConnected(false);
      });

      // Handle channel status
      newSocket.on("channelJoined", ({ channelId }) => {
        console.log(
          "SocketContext: Joined channel",
          channelId,
          "for session:",
          sessionId
        );
        setCurrentChannelId(channelId);
        lastChannelRef.current = channelId; // Save the channel ID for reconnection
      });

      // Handle presence updates
      newSocket.on("updatePresence", (users) => {
        console.log(
          "SocketContext: Presence update",
          users,
          "for session:",
          sessionId
        );
        setPresenceUsers(users);
      });

      // Set the socket in state
      setSocket(newSocket);

      // Clean up on unmount or when auth changes
      return () => {
        console.log(
          "Disconnecting socket:",
          socketIdRef.current,
          "for session:",
          sessionId
        );
        if (currentChannelId && newSocket) {
          newSocket.emit("leaveChannel", { channelId: currentChannelId });
        }
        newSocket.disconnect();
        socketRef.current = null;
        socketIdRef.current = null;
        setSocket(null);
        setConnected(false);
        // Don't clear currentChannelId or lastChannelRef to preserve state
      };
    } else {
      // No authenticated user, ensure socket is disconnected
      if (socketRef.current) {
        console.log(
          "No auth, disconnecting socket:",
          socketIdRef.current,
          "for session:",
          sessionId
        );
        socketRef.current.disconnect();
        socketRef.current = null;
        socketIdRef.current = null;
        setSocket(null);
        setConnected(false);
        setCurrentChannelId(null);
        lastChannelRef.current = null; // Clear the last channel reference
        setPresenceUsers([]);
      }
    }
  }, [isAuthenticated, user, token, sessionId]); // Only necessary dependencies

  // Value to provide to consumers
  const value = {
    socket,
    connected,
    currentChannelId,
    presenceUsers,
    joinChannel,
    leaveChannel,
    sessionId,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

// Single export statement at the end
export { SocketContext, SocketProvider, useSocket };
