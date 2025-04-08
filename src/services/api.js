import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token in headers if available
api.interceptors.request.use(
  (config) => {
    // Get the sessionId from sessionStorage
    const sessionId = sessionStorage.getItem("sessionId");

    // Use session-specific token key
    const token = sessionId ? localStorage.getItem(`token_${sessionId}`) : null;

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log(
        `Token found for session ${sessionId} (${token.substring(
          0,
          15
        )}...), adding to request headers`
      );
    } else {
      console.warn(
        `No token found for session ${sessionId || "unknown"} for request:`,
        config.url
      );
    }

    console.log("API Request:", {
      url: config.url,
      method: config.method,
      sessionId,
      hasToken: !!token,
      headers: config.headers,
    });

    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to log responses
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Handle unauthorized errors (token expired or invalid)
    if (error.response?.status === 401) {
      console.warn("Unauthorized request detected, redirecting to login");
      // Get the sessionId
      const sessionId = sessionStorage.getItem("sessionId");
      // Clear session-specific auth data
      if (sessionId) {
        localStorage.removeItem(`token_${sessionId}`);
        localStorage.removeItem(`user_${sessionId}`);
      }
      // Clear old style tokens for compatibility
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Register a new user
export const registerUser = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Login a user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Get all servers for the current user
export const getUserServers = async () => {
  try {
    // Force refresh of the token from sessionStorage
    const sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      console.error("No session ID available for getUserServers request");
      throw { message: "Session not found" };
    }

    const token = localStorage.getItem(`token_${sessionId}`);
    if (!token) {
      console.error("No token available for getUserServers request");
      throw { message: "Authentication required" };
    }

    const response = await api.get("/servers");
    return response.data;
  } catch (error) {
    console.error("getUserServers error:", error);
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Get all channels for a specific server
export const getServerChannels = async (serverId) => {
  try {
    if (!serverId) {
      console.error("No serverId provided to getServerChannels");
      return [];
    }

    const response = await api.get(`/servers/${serverId}/channels`);
    return response.data;
  } catch (error) {
    console.error("getServerChannels error:", error);
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Get message history for a specific channel
export const getChannelMessages = async (channelId, limit = 50) => {
  try {
    if (!channelId) {
      console.error("No channelId provided to getChannelMessages");
      return [];
    }

    console.log(
      `Fetching messages for channel ${channelId} with limit ${limit}`
    );
    const sessionId = sessionStorage.getItem("sessionId");
    console.log(
      `Current token for session ${sessionId}: ${
        localStorage.getItem(`token_${sessionId}`) ? "Present" : "Missing"
      }`
    );

    const response = await api.get(`/channels/${channelId}/messages`, {
      params: { limit },
    });

    console.log(`Successfully fetched ${response.data.length} messages`);
    return response.data;
  } catch (error) {
    console.error("getChannelMessages error:", error);
    console.error("Error details:", error.response?.data);
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Get all available servers
export const getAllServers = async () => {
  try {
    const response = await api.get("/servers/all");
    return response.data;
  } catch (error) {
    console.error("getAllServers error:", error);
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Join a server
export const joinServer = async (serverId) => {
  try {
    if (!serverId) {
      console.error("No serverId provided to joinServer");
      throw { message: "Server ID is required" };
    }

    const response = await api.post(`/servers/${serverId}/join`);
    return response.data;
  } catch (error) {
    console.error("joinServer error:", error);
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Create a new server
export const createServer = async (serverData) => {
  try {
    if (!serverData || !serverData.name) {
      console.error("Invalid server data provided to createServer");
      throw { message: "Server name is required" };
    }

    const response = await api.post("/servers", serverData);
    return response.data;
  } catch (error) {
    console.error("createServer error:", error);
    throw error.response?.data || { message: "Network or server error" };
  }
};

// Create a new channel in a server
export const createChannel = async (serverId, channelData) => {
  try {
    if (!serverId) {
      console.error("No serverId provided to createChannel");
      throw { message: "Server ID is required" };
    }

    if (!channelData || !channelData.name) {
      console.error("Invalid channel data provided to createChannel");
      throw { message: "Channel name is required" };
    }

    const response = await api.post(
      `/servers/${serverId}/channels`,
      channelData
    );
    return response.data;
  } catch (error) {
    console.error("createChannel error:", error);
    throw error.response?.data || { message: "Network or server error" };
  }
};

export default api;
