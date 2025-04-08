import React, { createContext, useState, useContext, useEffect } from "react";

// Create the auth context
const AuthContext = createContext();

// Custom hook for using the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Generate a unique session ID for this browser instance
const getSessionId = () => {
  // Check if we already have a session ID in sessionStorage
  let sessionId = sessionStorage.getItem("sessionId");
  if (!sessionId) {
    // Create a new random session ID
    sessionId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

// Auth context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionId = getSessionId();

  // Check for existing authentication on mount
  useEffect(() => {
    console.log("Checking for stored authentication...");
    console.log("Session ID:", sessionId);

    // Only use session-specific token, completely remove the shared token approach
    const storedToken = localStorage.getItem(`token_${sessionId}`);
    const storedUser = localStorage.getItem(`user_${sessionId}`);

    if (storedToken && storedUser) {
      console.log("Found stored authentication data for session:", sessionId);
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log("Auth restored from localStorage:", {
          userId: parsedUser._id,
          username: parsedUser.username,
          tokenLength: storedToken.length,
        });
      } catch (err) {
        console.error("Error parsing stored user:", err);
        // Clear invalid data
        localStorage.removeItem(`token_${sessionId}`);
        localStorage.removeItem(`user_${sessionId}`);
      }
    } else {
      console.log("No stored authentication found for session:", sessionId);
    }

    setLoading(false);
  }, [sessionId]);

  // Login function
  const login = (userData, authToken) => {
    console.log("Login called with:", {
      userId: userData._id,
      username: userData.username,
      tokenLength: authToken.length,
      sessionId: sessionId,
    });

    // ONLY store with session-specific keys, completely remove the shared token approach
    localStorage.setItem(`token_${sessionId}`, authToken);
    localStorage.setItem(`user_${sessionId}`, JSON.stringify(userData));

    // Remove any old-style storage to avoid conflicts
    if (localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
  };

  // Logout function
  const logout = () => {
    console.log("Logging out user for session:", sessionId);

    // ONLY remove session-specific items
    localStorage.removeItem(`token_${sessionId}`);
    localStorage.removeItem(`user_${sessionId}`);

    // Don't touch any other session tokens

    setUser(null);
    setToken(null);
    setIsAuthenticated(false);

    // Set a flag to indicate this session was logged out
    sessionStorage.setItem("loggedOut", "true");
  };

  // Context value
  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    sessionId,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
