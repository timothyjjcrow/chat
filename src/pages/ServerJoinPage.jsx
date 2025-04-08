import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ServerBrowser from "../components/ServerBrowser";
import "../ServerJoin.css";

function ServerJoinPage() {
  const { user, logout, sessionId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!localStorage.getItem(`token_${sessionId}`)) {
      console.log("No token found for session, redirecting to login");
      logout();
      navigate("/login");
    }
  }, [logout, navigate, sessionId]);

  const handleServerJoined = (serverId) => {
    // Short delay to allow server joining to complete
    setTimeout(() => {
      // Navigate to the chat page and select the joined server
      navigate("/", { state: { selectedServerId: serverId } });
    }, 500);
  };

  return (
    <div className="server-join-page">
      <div className="server-join-header">
        <h1>Join a Server</h1>
        <p>Browse available servers and join the ones you're interested in</p>
        <button className="back-button" onClick={() => navigate("/")}>
          Back to Chat
        </button>
      </div>
      <ServerBrowser onServerJoined={handleServerJoined} />
    </div>
  );
}

export default ServerJoinPage;
