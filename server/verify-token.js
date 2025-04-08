const jwt = require("jsonwebtoken");

// The actual token from registration
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZjQ1NDAwMmUyMzBjNjdmNmQ3MjA0NiIsImlhdCI6MTc0NDA2NTUzNiwiZXhwIjoxNzQ0MTUxOTM2fQ.1rmovMQRfQoI0_UDY2tm72BE6QHwASL2FQstb8Rnm8I";

// Use the same secret from your .env file
const JWT_SECRET = "discord_clone_jwt_secret_key_7x8f9g7h6j5k4l3";

try {
  const decoded = jwt.verify(token, JWT_SECRET);

  console.log("Decoded Token:");
  console.log(JSON.stringify(decoded, null, 2));

  // Calculate expiration time
  const expirationDate = new Date(decoded.exp * 1000);
  console.log(`Expires at: ${expirationDate}`);

  // Check if token is still valid
  const now = Math.floor(Date.now() / 1000);
  console.log(`Token is ${decoded.exp > now ? "valid" : "expired"}`);

  // Display user ID
  console.log(`User ID: ${decoded.id}`);
} catch (error) {
  console.error("Invalid token:", error.message);
}
