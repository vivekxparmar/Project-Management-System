const Notification = require("../models/Notification");
const Project = require("../models/Project");
const User = require("../models/User");
const { NOTIFICATION_TYPES } = require("../utils/constants");

// @desc    Get user's notifications
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user._id;

    let query = { userId };

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate("projectId", "name")
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notifications count
// @route   GET /api/v1/notifications/unread/count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    // Send real-time update
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:read", {
      notificationId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    // Send real-time update
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:allRead", {
      userId,
    });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Send real-time update
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:deleted", {
      notificationId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/v1/notifications/delete-all
// @access  Private
const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ userId });

    // Send real-time update
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:allDeleted", {
      userId,
    });

    res.status(200).json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification preferences
// @route   GET /api/v1/notifications/preferences
// @access  Private
const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("notificationPreferences");

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

    res.status(200).json({
      success: true,
      data: user?.notificationPreferences || defaultPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/notifications/preferences
// @access  Private
const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { emailNotifications, inAppNotifications, types } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        notificationPreferences: {
          emailNotifications,
          inAppNotifications,
          types,
        },
      },
      { new: true, upsert: true },
    ).select("notificationPreferences");

    res.status(200).json({
      success: true,
      data: user.notificationPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create custom notification (for testing)
// @route   POST /api/v1/notifications/test
// @access  Private
const createTestNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type, sender, projectId } = req.body;

    const notification = await Notification.create({
      userId,
      projectId: projectId || null,
      type: type || NOTIFICATION_TYPES.TASK_ASSIGNED,
      title,
      message,
      sender: req.user._id,
      data: { test: true },
    });

    // Send real-time notification
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:new", notification);

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getPreferences,
  updatePreferences,
  createTestNotification,
};
