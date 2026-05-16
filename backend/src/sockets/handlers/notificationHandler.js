const Notification = require("../../models/Notification");
const Project = require("../../models/Project");

const setupNotificationHandlers = (io, socket) => {
  const userId = socket.user._id.toString();

  // Join user's personal room for notifications
  socket.join(`user:${userId}`);

  // Handle marking single notification as read
  socket.on("notification:markRead", async (notificationId) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true },
      );

      if (notification) {
        io.to(`user:${userId}`).emit("notification:updated", notification);

        // Send updated unread count
        const unreadCount = await Notification.countDocuments({
          userId,
          isRead: false,
        });
        io.to(`user:${userId}`).emit("notification:unreadCount", {
          count: unreadCount,
        });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      socket.emit("notification:error", {
        message: "Failed to mark notification as read",
      });
    }
  });

  // Handle marking all notifications as read
  socket.on("notification:markAllRead", async () => {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      if (result.modifiedCount > 0) {
        io.to(`user:${userId}`).emit("notification:allRead", {
          count: result.modifiedCount,
          timestamp: new Date(),
        });

        // Send updated unread count
        io.to(`user:${userId}`).emit("notification:unreadCount", { count: 0 });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      socket.emit("notification:error", {
        message: "Failed to mark all as read",
      });
    }
  });

  // Handle getting unread count
  socket.on("notification:getUnreadCount", async () => {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      socket.emit("notification:unreadCount", { count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      socket.emit("notification:error", {
        message: "Failed to get unread count",
      });
    }
  });

  // Handle getting all notifications (with pagination)
  socket.on("notification:getAll", async (data) => {
    try {
      const { page = 1, limit = 20 } = data || {};
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find({ userId })
          .populate("projectId", "name")
          .populate("sender", "name email avatar")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments({ userId }),
      ]);

      socket.emit("notification:all", {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      socket.emit("notification:error", {
        message: "Failed to get notifications",
      });
    }
  });

  // Handle deleting single notification
  socket.on("notification:delete", async (notificationId) => {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId,
      });

      if (notification) {
        io.to(`user:${userId}`).emit("notification:deleted", {
          notificationId,
        });

        // Send updated unread count
        const unreadCount = await Notification.countDocuments({
          userId,
          isRead: false,
        });
        io.to(`user:${userId}`).emit("notification:unreadCount", {
          count: unreadCount,
        });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      socket.emit("notification:error", {
        message: "Failed to delete notification",
      });
    }
  });

  // Handle deleting all notifications
  socket.on("notification:deleteAll", async () => {
    try {
      const result = await Notification.deleteMany({ userId });

      if (result.deletedCount > 0) {
        io.to(`user:${userId}`).emit("notification:allDeleted", {
          count: result.deletedCount,
          timestamp: new Date(),
        });

        // Send updated unread count
        io.to(`user:${userId}`).emit("notification:unreadCount", { count: 0 });
      }
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      socket.emit("notification:error", {
        message: "Failed to delete all notifications",
      });
    }
  });

  // Handle getting notifications by type
  socket.on("notification:getByType", async (data) => {
    try {
      const { type, limit = 20 } = data;

      const notifications = await Notification.find({
        userId,
        type,
      })
        .populate("projectId", "name")
        .sort({ createdAt: -1 })
        .limit(limit);

      socket.emit("notification:byType", {
        type,
        notifications,
        count: notifications.length,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error getting notifications by type:", error);
      socket.emit("notification:error", {
        message: "Failed to get notifications by type",
      });
    }
  });

  // Handle notification preferences update
  socket.on("notification:updatePreferences", async (data) => {
    try {
      const { emailNotifications, inAppNotifications, types } = data;

      // Update user's notification preferences
      const User = require("../../models/User");
      const user = await User.findByIdAndUpdate(
        userId,
        {
          notificationPreferences: {
            emailNotifications,
            inAppNotifications,
            types: types || {},
          },
        },
        { new: true },
      ).select("notificationPreferences");

      socket.emit("notification:preferencesUpdated", {
        preferences: user.notificationPreferences,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      socket.emit("notification:error", {
        message: "Failed to update preferences",
      });
    }
  });

  // Handle getting notification preferences
  socket.on("notification:getPreferences", async () => {
    try {
      const User = require("../../models/User");
      const user = await User.findById(userId).select(
        "notificationPreferences",
      );

      const defaultPreferences = {
        emailNotifications: true,
        inAppNotifications: true,
        types: {
          task_assigned: true,
          task_updated: true,
          bug_reported: true,
          bug_assigned: true,
          bug_updated: true,
          sprint_created: true,
          sprint_completed: true,
          team_member_added: true,
          role_changed: true,
          mention: true,
          comment_added: true,
          resource_added: true,
        },
      };

      socket.emit("notification:preferences", {
        preferences: user?.notificationPreferences || defaultPreferences,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error getting preferences:", error);
      socket.emit("notification:error", {
        message: "Failed to get preferences",
      });
    }
  });

  // Real-time notification sender helper (can be called from other modules)
  const sendNotification = async (notificationData) => {
    try {
      const notification = await Notification.create(notificationData);

      const populatedNotification = await Notification.findById(
        notification._id,
      )
        .populate("projectId", "name")
        .populate("sender", "name email avatar");

      console.log(populatedNotification.sender);

      // Send real-time to user
      io.to(`user:${notification.userId}`).emit(
        "notification:new",
        populatedNotification,
      );

      // Update unread count for user
      const unreadCount = await Notification.countDocuments({
        userId: notification.userId,
        isRead: false,
      });
      io.to(`user:${notification.userId}`).emit("notification:unreadCount", {
        count: unreadCount,
      });

      return notification;
    } catch (error) {
      console.error("Error sending real-time notification:", error);
      return null;
    }
  };

  // Attach sendNotification to socket for use in other handlers
  socket.sendNotification = sendNotification;

  // Handle test notification (for development)
  if (process.env.NODE_ENV === "development") {
    socket.on("notification:test", async (data) => {
      try {
        const { title, message, type, projectId } = data;

        const testNotification = await sendNotification({
          userId,
          projectId: projectId || null,
          type: type || "task_assigned",
          title: title || "Test Notification",
          message: message || "This is a test notification",
          data: { test: true },
        });

        socket.emit("notification:testSent", {
          notification: testNotification,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error sending test notification:", error);
      }
    });
  }
};

module.exports = { setupNotificationHandlers };
