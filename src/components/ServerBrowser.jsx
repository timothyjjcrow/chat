import React, { useState, useEffect } from "react";
import { getAllServers, joinServer } from "../services/api";

const ServerBrowser = ({ onServerJoined }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joiningServerId, setJoiningServerId] = useState(null);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllServers();
        setServers(data);
      } catch (err) {
        console.error("Error fetching servers:", err);
        setError(err.message || "Failed to load servers");
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  const handleJoinServer = async (serverId) => {
    try {
      setJoiningServerId(serverId);
      setError(null);

      await joinServer(serverId);

      // Update the server list
      const updatedServers = servers.map((server) =>
        server._id === serverId ? { ...server, isMember: true } : server
      );
      setServers(updatedServers);

      // Notify parent component
      if (onServerJoined) {
        onServerJoined(serverId);
      }
    } catch (err) {
      console.error("Error joining server:", err);
      setError(err.message || "Failed to join server");
    } finally {
      setJoiningServerId(null);
    }
  };

  // Generate a server avatar from server name
  const getServerAvatar = (name) => {
    if (!name) return "?";

    // Get first letter of each word, up to 2 letters
    const initials = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");

    return initials || name.charAt(0).toUpperCase();
  };

  // Format date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return <div className="server-browser loading">Loading servers...</div>;
  }

  if (error) {
    return <div className="server-browser error">Error: {error}</div>;
  }

  return (
    <div className="server-browser">
      <h2>Available Servers</h2>
      {servers.length === 0 ? (
        <p className="no-servers">No servers available. Create your own!</p>
      ) : (
        <ul className="server-browser-list">
          {servers.map((server) => (
            <li key={server._id} className="server-browser-item">
              <div className="server-avatar">
                {getServerAvatar(server.name)}
              </div>
              <div className="server-info">
                <h3 title={server.name}>{server.name}</h3>
                <p>
                  <span className="label">Owner:</span>
                  <span>{server.owner.username}</span>
                </p>
                <p>
                  <span className="label">Members:</span>
                  <span>{server.memberCount}</span>
                </p>
                <p className="server-created">
                  <span className="label">Created:</span>{" "}
                  <span>{formatDate(server.createdAt)}</span>
                </p>
              </div>
              <div className="server-action">
                {server.isMember ? (
                  <span className="joined-badge">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                        fill="currentColor"
                      />
                    </svg>
                    Joined
                  </span>
                ) : (
                  <button
                    className="join-button"
                    onClick={() => handleJoinServer(server._id)}
                    disabled={joiningServerId === server._id}
                  >
                    {joiningServerId === server._id
                      ? "Joining..."
                      : "Join Server"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ServerBrowser;
