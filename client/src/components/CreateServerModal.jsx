import React, { useState } from "react";
import { createServer } from "../services/api";
import "../Modal.css"; // Updated path to Modal.css

const CreateServerModal = ({ onClose, onServerCreated }) => {
  const [serverName, setServerName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate input
    if (!serverName.trim()) {
      setError("Server name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      // Call the API to create the server
      const newServer = await createServer({ name: serverName.trim() });

      // Call the callback to inform parent component
      onServerCreated(newServer);

      // Close the modal
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create server");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create a Server</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="serverName">SERVER NAME</label>
            <input
              type="text"
              id="serverName"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Enter server name"
              disabled={isSubmitting}
              autoFocus
              maxLength="100"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            <div className="help-text">
              Give your server a unique name to help members find it.
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
              disabled={isSubmitting || !serverName.trim()}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServerModal;
