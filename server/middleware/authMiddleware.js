const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to protect routes that require authentication
 * Verifies JWT token from Authorization header (Bearer token)
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      console.log(`Verifying token: ${token.substring(0, 15)}...`);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`Token decoded, user ID: ${decoded.id}`);

      // Find user by ID from decoded token
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        console.log(`User not found for ID: ${decoded.id}`);
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      console.log(`User authenticated: ${user.username} (${user._id})`);
      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }
};
