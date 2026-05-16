const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const path = require("path");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const fileUpload = require("express-fileupload");

// Load environment variables
dotenv.config();

// Import configurations
const connectDB = require("./config/database");
const { setupSocket } = require("./sockets");
const { setupCronJobs } = require("./utils/cronJobs");
// Import routes
const routes = require("./routes");

// Import middleware
const { errorHandler } = require("./middleware/errorHandler");

// Import passport config
require("./config/passport")(passport);

// Initialize express app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});
app.set("io", io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://sprintforge-ten.vercel.app",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// File upload middleware
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true,
    createParentPath: true,
  }),
);

app.use(passport.initialize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
// app.use("/api", limiter);
// app.use("/api");

// Static files (for uploads if needed)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Make io available in routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use("/api/v1", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Google OAuth routes (if using redirect flow)
app.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  },
);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Setup socket handlers
setupSocket(io, app);

// Setup cron jobs
setupCronJobs(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Uploads directory: ${path.join(__dirname, "../uploads")}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  // Close server & exit process
  server.close(() => {
    console.error("Server closed due to unhandled rejection");
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Close server & exit process
  server.close(() => {
    console.error("Server closed due to uncaught exception");
    process.exit(1);
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("Received shutdown signal, closing server...");
  server.close(async () => {
    console.log("HTTP server closed");
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
