const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const { setupNotificationHandlers } = require("./handlers/notificationHandler");
const { setupChatHandlers } = require("./handlers/chatHandler");
const { setupAuditHandlers } = require("./handlers/auditHandler");

// Store online users with their projects and socket info
const onlineUsers = new Map();
const userSockets = new Map();

const setupSocket = (io, app) => {
  // Authentication middleware for socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        "-password -otp -resetPasswordOTP",
      );

      if (!user) {
        return next(new Error("User not found"));
      }

      if (!user.isActive) {
        return next(new Error("Account is deactivated"));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const userName = socket.user.name;

    console.log(`User connected: ${userName} (${userId})`);

    // Initialize or update online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, {
        socketIds: new Set(),
        projects: new Set(),
        userInfo: {
          _id: userId,
          name: socket.user.name,
          email: socket.user.email,
          avatar: socket.user.avatar,
        },
        lastSeen: new Date(),
      });
    }

    const userData = onlineUsers.get(userId);
    userData.socketIds.add(socket.id);
    userData.lastSeen = new Date();

    // Also track in userSockets Map
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join user to their personal room for direct notifications
    socket.join(`user:${userId}`);

    // Join user to global room for system notifications
    socket.join("global");

    // Broadcast online users to all connected clients
    const onlineUsersList = Array.from(onlineUsers.keys()).map((id) => ({
      _id: id,
      name: onlineUsers.get(id).userInfo.name,
      avatar: onlineUsers.get(id).userInfo.avatar,
    }));

    io.emit("users:online", {
      users: onlineUsersList,
      count: onlineUsers.size,
      timestamp: new Date(),
    });

    // Setup notification handlers
    setupNotificationHandlers(io, socket);

    // Setup chat handlers
    setupChatHandlers(io, socket);

    // Setup audit handlers
    setupAuditHandlers(io, socket);

    // Handle joining project room
    socket.on("project:join", (projectId) => {
      if (!projectId) {
        console.error("Invalid projectId for join");
        return;
      }

      socket.join(`project:${projectId}`);

      // Add project to user's projects
      const userData = onlineUsers.get(userId);
      if (userData) {
        userData.projects.add(projectId);
      }

      console.log(`📡 User ${userName} joined project ${projectId}`);

      // Get all online users in this project
      const projectOnlineUsers = [];
      for (const [uid, data] of onlineUsers.entries()) {
        if (data.projects.has(projectId)) {
          projectOnlineUsers.push({
            _id: uid,
            name: data.userInfo.name,
            avatar: data.userInfo.avatar,
          });
        }
      }

      // Send current online users to the joining user
      socket.emit("project:onlineUsers", {
        projectId,
        users: projectOnlineUsers,
        count: projectOnlineUsers.length,
      });

      // Notify other project members that this user is online
      socket.to(`project:${projectId}`).emit("user:online", {
        userId,
        userName,
        userAvatar: socket.user.avatar,
        projectId,
        timestamp: new Date(),
      });
    });

    // Handle leaving project room
    socket.on("project:leave", (projectId) => {
      if (!projectId) return;

      socket.leave(`project:${projectId}`);

      // Remove project from user's projects
      const userData = onlineUsers.get(userId);
      if (userData) {
        userData.projects.delete(projectId);
      }

      console.log(`📡 User ${userName} left project ${projectId}`);

      // Notify project members that user is offline
      socket.to(`project:${projectId}`).emit("user:offline", {
        userId,
        userName,
        projectId,
        timestamp: new Date(),
      });
    });

    // Handle ping/pong for connection health check
    socket.on("ping", (callback) => {
      if (typeof callback === "function") {
        callback({ pong: true, timestamp: new Date() });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userName} (${userId})`);

      // Remove socket from user's data
      const userData = onlineUsers.get(userId);
      if (userData) {
        userData.socketIds.delete(socket.id);

        // Also remove from userSockets
        const userSocketSet = userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            userSockets.delete(userId);
          }
        }

        // If no more sockets for this user, remove from online users completely
        if (userData.socketIds.size === 0) {
          // Notify all projects that user is offline
          for (const projectId of userData.projects) {
            io.to(`project:${projectId}`).emit("user:offline", {
              userId,
              userName,
              projectId,
              timestamp: new Date(),
            });
          }

          onlineUsers.delete(userId);

          // Broadcast updated online users list
          const onlineUsersList = Array.from(onlineUsers.keys()).map((id) => ({
            _id: id,
            name: onlineUsers.get(id)?.userInfo.name,
            avatar: onlineUsers.get(id)?.userInfo.avatar,
          }));

          io.emit("users:online", {
            users: onlineUsersList,
            count: onlineUsers.size,
            timestamp: new Date(),
          });
        }
      }
    });
  });

  // Store onlineUsers in app for API access
  app.set("onlineUsers", onlineUsers);
  app.set("userSockets", userSockets);

  console.log("Socket.io initialized");
};

module.exports = { setupSocket };
