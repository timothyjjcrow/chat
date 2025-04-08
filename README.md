# Discord Clone

A full-stack real-time chat application inspired by Discord, built with MERN stack and Socket.io.

## Project Structure

- **client**: React.js front-end built with Vite
- **server**: Express.js back-end with MongoDB and Socket.io

## Deployment Instructions

### Front-end (Vercel)

1. Connect this GitHub repository to Vercel
2. Set the root directory to `discord-clone/client`
3. Set the build command to `npm run build`
4. Set environment variables:
   - `VITE_API_URL`: Your deployed backend URL with `/api` (e.g., https://your-backend.onrender.com/api)
   - `VITE_SOCKET_URL`: Your deployed backend URL (e.g., https://your-backend.onrender.com)

### Back-end (Render or similar)

1. Deploy the server directory to Render, Railway, or a similar service
2. Set environment variables:
   - `PORT`: The port for your server (usually provided by the platform)
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure string for JWT signing
   - `CLIENT_URL`: Your front-end URL for CORS configuration

## Development

1. Clone this repository
2. Install dependencies in both client and server directories:
   ```
   cd discord-clone/client && npm install
   cd discord-clone/server && npm install
   ```
3. Create .env files in both directories with appropriate variables
4. Run both client and server in development mode:

   ```
   # In client directory
   npm run dev

   # In server directory
   npm run dev
   ```

## Features

- Real-time messaging with Socket.io
- User authentication with JWT
- Create and join servers and channels
- User presence (online/offline status)
- Message history

## Technologies Used

### Frontend

- React
- React Router DOM
- Socket.IO Client
- Axios

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- JWT Authentication
- bcrypt.js
