import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";
import ServerList from "../components/ServerList";
import ChannelList from "../components/ChannelList";
import UserList from "../components/UserList";
import { getServerChannels, getChannelMessages } from "../services/api";

function ChatPage() {
  const { user, logout, token, sessionId } = useAuth();
  const { socket, connected, joinChannel, currentChannelId } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  // Ref to track the previous channel ID for proper cleanup
  const prevChannelIdRef = useRef(null);

  // Server and channel state
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channelsCache, setChannelsCache] = useState({});

  // Check for server selection in location state (from server join page)
  useEffect(() => {
    if (location.state?.selectedServerId) {
      console.log(
        "Server selection from navigation state:",
        location.state.selectedServerId
      );
      setSelectedServerId(location.state.selectedServerId);

      // Clear the state to avoid reapplying on subsequent renders
      navigate("/", { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Log authentication state
  useEffect(() => {
    console.log("ChatPage - Auth state:", {
      user,
      hasToken: !!token,
      tokenInLocalStorage: !!localStorage.getItem(`token_${sessionId}`),
      sessionId,
    });

    // If token is missing but we're on this page, re-fetch it
    if (!localStorage.getItem(`token_${sessionId}`)) {
      console.error("No token found in localStorage for session:", sessionId);
      logout();
      navigate("/login");
    }
  }, [user, token, logout, navigate, sessionId]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on("receiveMessage", (message) => {
      console.log("Message received:", message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Listen for message errors
    socket.on("messageError", (error) => {
      console.error("Message error:", error);
      setError(`Failed to send message: ${error.error}`);
    });

    // Clean up event listeners on unmount
    return () => {
      socket.off("receiveMessage");
      socket.off("messageError");
    };
  }, [socket]);

  // Fetch channel details when selectedChannelId changes
  useEffect(() => {
    if (!selectedChannelId || !selectedServerId) {
      setCurrentChannel(null);
      return;
    }

    // Check if we already have the channel information in cache
    if (channelsCache[selectedServerId]) {
      const channel = channelsCache[selectedServerId].find(
        (ch) => ch._id === selectedChannelId
      );
      if (channel) {
        setCurrentChannel(channel);
        return;
      }
    }

    // If not in cache, fetch channel details
    const fetchChannelDetails = async () => {
      try {
        const channels = await getServerChannels(selectedServerId);

        // Update channels cache
        setChannelsCache((prev) => ({
          ...prev,
          [selectedServerId]: channels,
        }));

        // Find the selected channel
        const channel = channels.find((ch) => ch._id === selectedChannelId);
        if (channel) {
          setCurrentChannel(channel);
        }
      } catch (err) {
        console.error("Error fetching channel details:", err);
      }
    };

    fetchChannelDetails();
  }, [selectedChannelId, selectedServerId, channelsCache]);

  // Fetch message history when joining a channel - with proper dependency management
  useEffect(() => {
    if (!selectedChannelId || !socket) return;

    // Get the previous channel ID
    const prevChannelId = prevChannelIdRef.current;

    // Store current channel ID for next render
    prevChannelIdRef.current = selectedChannelId;

    // Leave previous channel if exists and different from current
    if (prevChannelId && prevChannelId !== selectedChannelId && socket) {
      console.log(`Leaving channel: ${prevChannelId}`);
      socket.emit("leaveChannel", { channelId: prevChannelId });
    }

    // Skip loading if socket not connected
    if (!connected) {
      console.log(
        "Socket not connected, waiting for connection before fetching messages"
      );
      setError("Connecting to chat server...");
      return;
    }

    // Clear messages only when changing channels, not on reconnection
    setMessages([]);
    setLoadingMessages(true);
    setError("");

    let isMounted = true;
    let timeout;

    const fetchMessageHistory = async () => {
      if (!isMounted) return;

      try {
        // Join the new channel via socket
        console.log(`Joining channel: ${selectedChannelId}`);
        joinChannel(selectedChannelId);

        // Fetch message history from API with delay to ensure connection
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!isMounted) return;

        console.log(
          `Fetching message history for channel: ${selectedChannelId}`
        );
        const messageHistory = await getChannelMessages(selectedChannelId);

        // Format messages
        const formattedMessages = messageHistory.map((msg) => ({
          _id: msg._id,
          sender: msg.sender.username,
          text: msg.content,
          userId: msg.sender._id,
          channelId: msg.channel,
          timestamp: msg.timestamp,
        }));

        // Update messages if component still mounted
        if (isMounted) {
          setMessages(formattedMessages);
          console.log(`Loaded ${formattedMessages.length} historical messages`);
        }
      } catch (err) {
        console.error("Error fetching message history:", err);
        if (isMounted) {
          setError("Failed to load message history");
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    // Delay fetching to avoid rapid reconnections
    timeout = setTimeout(fetchMessageHistory, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [selectedChannelId, socket, joinChannel]); // Keep these minimal dependencies

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle server selection with useCallback to prevent unnecessary re-renders
  const handleServerSelect = useCallback((serverId) => {
    console.log("Server selected:", serverId);
    setSelectedServerId(serverId);
    setSelectedChannelId(null); // Reset channel selection when server changes
  }, []);

  // Handle channel selection with useCallback to prevent unnecessary re-renders
  const handleChannelSelect = useCallback(
    (channelId) => {
      console.log("Channel selected:", channelId);

      // If already in this channel, don't do anything
      if (selectedChannelId === channelId) return;

      setSelectedChannelId(channelId);
    },
    [selectedChannelId]
  );

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!messageInput.trim()) return;

    if (!socket || !connected) {
      setError("Not connected to chat. Please try again later.");
      return;
    }

    if (!selectedChannelId) {
      setError("Please select a channel to send messages.");
      return;
    }

    if (currentChannelId !== selectedChannelId) {
      setError("Not yet joined the channel. Please wait or try again.");
      return;
    }

    // Create message object
    const messageObj = {
      sender: user.username,
      text: messageInput.trim(),
      userId: user._id,
      channelId: selectedChannelId,
      serverId: selectedServerId,
    };

    // Send message via socket
    socket.emit("sendMessage", messageObj);

    // Clear input field
    setMessageInput("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get channel type icon
  const getChannelIcon = (type) => {
    return type === "text" ? "#" : "🔊";
  };

  // Check if the channel is active
  const isChannelActive =
    selectedChannelId && currentChannelId === selectedChannelId;

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>Discord Clone</h1>
        <div className="user-info">
          {user && <span>Welcome, {user.username}</span>}
          <div className="connection-status">
            {connected ? (
              <span className="status-connected">●&nbsp;Connected</span>
            ) : (
              <span className="status-disconnected">●&nbsp;Disconnected</span>
            )}
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="chat-layout">
        {/* Server list sidebar */}
        <div className="server-sidebar">
          <ServerList
            onServerSelect={handleServerSelect}
            selectedServerId={selectedServerId}
          />
        </div>

        {/* Channel list sidebar */}
        <div className="channel-sidebar">
          <ChannelList
            serverId={selectedServerId}
            onChannelSelect={handleChannelSelect}
            selectedChannelId={selectedChannelId}
          />
        </div>

        {/* Chat area */}
        <div className="chat-container">
          <div className="chat-header-channel">
            {currentChannel ? (
              <div className="channel-header-info">
                <h2>
                  {getChannelIcon(currentChannel.type)} {currentChannel.name}
                </h2>
                {isChannelActive && (
                  <span className="channel-status">Active</span>
                )}
              </div>
            ) : selectedChannelId ? (
              <h2>#{selectedChannelId}</h2>
            ) : (
              <h2>Select a channel</h2>
            )}
          </div>

          <div className="messages-container">
            {!selectedChannelId ? (
              <div className="no-channel-selected">
                Select a channel to start chatting
              </div>
            ) : !isChannelActive ? (
              <div className="channel-joining">Connecting to channel...</div>
            ) : loadingMessages ? (
              <div className="loading-messages">Loading message history...</div>
            ) : messages.length === 0 ? (
              <div className="no-messages">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg._id || index}
                  className={`message ${
                    msg.userId === user?._id ? "own-message" : ""
                  }`}
                >
                  <div className="message-header">
                    <span className="message-sender">{msg.sender}</span>
                    <span className="message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="message-form-container">
            <form className="message-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={
                  selectedChannelId
                    ? "Type a message..."
                    : "Select a channel to chat"
                }
                className="message-input"
                disabled={!isChannelActive || !connected}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!isChannelActive || !connected}
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* User list sidebar */}
        {selectedChannelId && (
          <div className="users-sidebar">
            <UserList />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
