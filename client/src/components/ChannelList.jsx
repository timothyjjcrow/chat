import React, { useState, useEffect } from "react";
import { getServerChannels } from "../services/api";
import CreateChannelModal from "./CreateChannelModal";

const ChannelList = ({ serverId, onChannelSelect, selectedChannelId }) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prevServerId, setPrevServerId] = useState(null);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] =
    useState(false);

  // Function to fetch channel data
  const fetchChannels = async () => {
    // Don't fetch if no server is selected
    if (!serverId) {
      setChannels([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching channels for server: ${serverId}`);
      const data = await getServerChannels(serverId);

      setChannels(data);
      setPrevServerId(serverId);

      // If we have channels and either no channel is selected or the selected channel
      // does not belong to the current server, select the first channel by default
      if (
        data.length > 0 &&
        (!selectedChannelId ||
          !data.some((channel) => channel._id === selectedChannelId))
      ) {
        console.log("Auto-selecting first channel:", data[0]._id);
        onChannelSelect(data[0]._id);
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
      setError("Failed to load channels. Please try again later.");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch channels when serverId changes
  useEffect(() => {
    // Only fetch if serverId has actually changed
    if (serverId === prevServerId) {
      return;
    }

    let isMounted = true;

    const loadChannels = async () => {
      try {
        if (isMounted) {
          await fetchChannels();
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error in loadChannels:", err);
        }
      }
    };

    loadChannels();

    return () => {
      isMounted = false;
    };
  }, [serverId]); // Only re-run when serverId changes

  // Handle channel selection
  const handleChannelClick = (channelId) => {
    onChannelSelect(channelId);
  };

  // Handle opening create channel modal
  const handleCreateChannel = () => {
    setIsCreateChannelModalOpen(true);
  };

  // Handle channel created event
  const handleChannelCreated = (newChannel) => {
    console.log("New channel created:", newChannel);
    fetchChannels(); // Refresh the channel list
  };

  if (!serverId) {
    return <div className="no-server-selected">Please select a server</div>;
  }

  if (loading) {
    return <div className="channel-list-loading">Loading channels...</div>;
  }

  if (error) {
    return <div className="channel-list-error">{error}</div>;
  }

  return (
    <div className="channel-list">
      <div className="channel-list-header">
        <h3 className="channel-list-title">Channels</h3>
        <button
          className="create-channel-button"
          onClick={handleCreateChannel}
          title="Create Channel"
        >
          +
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="no-channels">No channels found.</div>
      ) : (
        <ul className="channels">
          {channels.map((channel) => {
            // Add icon based on channel type
            const icon = channel.type === "text" ? "#" : "🔊";

            return (
              <li
                key={channel._id}
                className={`channel-item ${
                  selectedChannelId === channel._id ? "active" : ""
                }`}
                onClick={() => handleChannelClick(channel._id)}
              >
                <span className="channel-icon">{icon}</span>
                <span className="channel-name">{channel.name}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create Channel Modal */}
      {isCreateChannelModalOpen && (
        <CreateChannelModal
          serverId={serverId}
          onClose={() => setIsCreateChannelModalOpen(false)}
          onChannelCreated={handleChannelCreated}
        />
      )}
    </div>
  );
};

export default ChannelList;
