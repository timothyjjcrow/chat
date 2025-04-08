const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    console.log(
      "Connecting to MongoDB with URI:",
      process.env.MONGO_URI.substring(0, 20) + "..."
    );

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit immediately in development to see full error
    if (process.env.NODE_ENV === "production") {
      process.exit(1); // Exit with failure only in production
    }
    throw error; // Propagate error for handling in server.js
  }
};

module.exports = connectDB;
