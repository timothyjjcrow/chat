import React, { useState } from "react";
import { createChannel } from "../services/api";
import "../Modal.css";

const CreateChannelModal = ({ serverId, onClose, onChannelCreated }) => {
  const [channelName, setChannelName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate input
    if (!channelName.trim()) {
      setError("Channel name is required");
      return;
    }

    // Enforce naming conventions (lowercase, no spaces)
    const formattedName = channelName.trim().toLowerCase().replace(/\s+/g, "-");

    try {
      setIsSubmitting(true);
      setError("");

      // Call the API to create the channel
      const newChannel = await createChannel(serverId, { name: formattedName });

      // Call the callback to inform parent component
      onChannelCreated(newChannel);

      // Close the modal
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create channel");
      setIsSubmitting(false);
    }
  };

  // Format channel name as user types
  const handleChannelNameChange = (e) => {
    const value = e.target.value;
    // Allow only lowercase letters, numbers, and hyphens in the input
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    setChannelName(formatted);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Channel</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="channelName">CHANNEL NAME</label>
            <div className="channel-input-wrapper">
              <span className="channel-prefix">#</span>
              <input
                type="text"
                id="channelName"
                value={channelName}
                onChange={handleChannelNameChange}
                placeholder="new-channel"
                disabled={isSubmitting}
                autoFocus
                maxLength="32"
                style={{
                  paddingLeft: "28px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="help-text">
              Use lowercase letters, numbers, and hyphens. No spaces allowed.
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || !channelName.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
