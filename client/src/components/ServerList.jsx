import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUserServers } from "../services/api";
import CreateServerModal from "./CreateServerModal";
import "./ServerList.css";

const ServerList = ({ onServerSelect, selectedServerId }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const serversRef = useRef([]); // Add a ref to track server list

  // Fetch user's servers when component mounts
  const fetchServers = async () => {
    try {
      setLoading(true);
      console.log("Fetching servers...");
      const data = await getUserServers();
      console.log("Servers response:", data);

      if (Array.isArray(data)) {
        setServers(data);
        serversRef.current = data; // Update ref with current servers

        // If we have servers and no selected server, select the first one by default
        if (data.length > 0 && !selectedServerId) {
          console.log("Auto-selecting first server:", data[0]._id);
          onServerSelect(data[0]._id);
        }
      } else {
        console.error("Server data is not an array:", data);
        setError("Invalid server data format");
      }
    } catch (err) {
      console.error("Error fetching servers:", err);
      setError(`Failed to load servers: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadServers = async () => {
      try {
        if (isMounted) {
          await fetchServers();
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error in loadServers:", err);
        }
      }
    };

    loadServers();

    // Set up refresh interval - but with a much longer delay (120 seconds instead of 30)
    // This prevents frequent reconnections that could interrupt the chat experience
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        // Instead of just refreshing, check if we need to refresh
        // Only update the server list if there's a change to avoid unnecessary state changes
        const refreshServerList = async () => {
          try {
            const data = await getUserServers();
            if (Array.isArray(data)) {
              // Compare if the server list has actually changed
              const currentServerIds = serversRef.current
                .map((s) => s._id)
                .sort()
                .join(",");
              const newServerIds = data
                .map((s) => s._id)
                .sort()
                .join(",");

              // Only update if the server list changed
              if (currentServerIds !== newServerIds) {
                console.log("Server list changed, updating...");
                setServers(data);
                serversRef.current = data; // Update ref with new data
              }
            }
          } catch (err) {
            console.error("Server refresh error:", err);
          }
        };

        refreshServerList();
      }
    }, 120000); // Refresh every 120 seconds instead of 30 seconds

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []); // Remove servers from dependencies

  // Handle server selection
  const handleServerClick = (serverId) => {
    console.log("Server clicked:", serverId);
    onServerSelect(serverId);
  };

  // Navigate to join server page
  const handleJoinNewServer = () => {
    navigate("/join-server");
  };

  // Handle server creation
  const handleCreateServer = () => {
    setIsCreateModalOpen(true);
  };

  // Handle server created event
  const handleServerCreated = (newServer) => {
    console.log("New server created:", newServer);
    fetchServers(); // Refresh the server list
  };

  if (loading) {
    return (
      <div className="server-sidebar-list">
        <div className="server-list-loading">Loading servers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="server-sidebar-list">
        <div className="server-list-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="server-sidebar-list">
      {servers.length === 0 ? (
        <div className="no-servers">No servers found.</div>
      ) : (
        <ul className="servers">
          {servers.map((server) => (
            <li
              key={server._id}
              className={`server-item ${
                selectedServerId === server._id ? "active" : ""
              }`}
              onClick={() => handleServerClick(server._id)}
              title={server.name}
            >
              <div className="server-avatar">
                {server.name.charAt(0).toUpperCase()}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="server-actions">
        <button
          className="join-new-server-button"
          onClick={handleJoinNewServer}
          title="Join a server"
        >
          ➕
        </button>
        <button
          className="create-server-button"
          onClick={handleCreateServer}
          title="Create a new server"
        >
          +
        </button>
      </div>

      {/* Create Server Modal */}
      {isCreateModalOpen && (
        <CreateServerModal
          onClose={() => setIsCreateModalOpen(false)}
          onServerCreated={handleServerCreated}
        />
      )}
    </div>
  );
};

export default ServerList;
