const ChatMessage = require("../models/ChatMessage");
const Project = require("../models/Project");
const User = require("../models/User");
const NotificationService = require("../services/notificationService");
const { NOTIFICATION_TYPES } = require("../utils/constants");

// @desc    Get chat messages for a project
// @route   GET /api/v1/chat/:projectId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, before } = req.query;

    let query = { projectId };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .populate("sender", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages.reverse(), // Return in chronological order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a new message
// @route   POST /api/v1/chat/:projectId
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { content, type, attachments, mentions } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Message content or attachments is required",
      });
    }

    const message = await ChatMessage.create({
      projectId,
      sender: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar,
      content: content || "",
      type: type || "text",
      attachments: attachments || [],
      mentions: mentions || [],
    });

    // Populate sender info
    const populatedMessage = await ChatMessage.findById(message._id).populate(
      "sender",
      "name email avatar",
    );

    if (mentions?.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $in: mentions },
      }).select("name");

      for (const user of mentionedUsers) {
        await NotificationService.userMentioned(
          user._id,
          projectId,
          req.user.name,
          content.substring(0, 100),
          message._id,
          "chat",
        );
      }
    }

    // Send real-time message to all users in project room
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("chat:message", {
      message: populatedMessage,
      projectId,
    });

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message
// @route   PUT /api/v1/chat/:messageId
// @access  Private (sender only)
const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    let message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    // Check if message is less than 10 minutes old
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > 10 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "Messages can only be edited within 10 minutes of sending",
      });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await ChatMessage.findById(messageId).populate(
      "sender",
      "name email avatar",
    );

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${message.projectId}`).emit("chat:messageEdited", {
      message: populatedMessage,
      editedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message
// @route   DELETE /api/v1/chat/:messageId
// @access  Private (sender or admin)
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    let message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user is sender or admin/owner
    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Admin" || req.user.role === "Owner";

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    // Soft delete - mark as deleted
    message.deletedAt = new Date();
    message.content = "This message was deleted";
    await message.save();

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${message.projectId}`).emit("chat:messageDeleted", {
      messageId,
      deletedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getOnlineUsers = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const onlineUsersMap = req.app.get("onlineUsers") || new Map();

    const project = await Project.findById(projectId)
      .populate("owner", "name email avatar")
      .populate({
        path: "members",
        populate: {
          path: "user",
          model: "User",
          select: "name email avatar role",
        },
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Get all member IDs from project
    const memberIds = [
      project.owner._id.toString(),
      ...project.members.map((m) => m.user._id.toString()),
    ];

    // Filter online users who are members of this project
    const onlineUsers = [];
    for (const memberId of memberIds) {
      if (onlineUsersMap.has(memberId)) {
        const userData = onlineUsersMap.get(memberId);
        // Find the user in project members or owner
        let userInfo;
        if (project.owner._id.toString() === memberId) {
          userInfo = project.owner;
        } else {
          const member = project.members.find(
            (m) => m.user._id.toString() === memberId,
          );
          userInfo = member?.user;
        }

        if (userInfo) {
          onlineUsers.push({
            _id: memberId,
            name: userInfo.name,
            email: userInfo.email,
            avatar: userInfo.avatar,
            lastSeen: userData.lastSeen,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: onlineUsers.length,
      data: onlineUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread message count
// @route   GET /api/v1/chat/:projectId/unread
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const lastRead = req.user.lastReadAt?.get(projectId) || new Date(0);

    const unreadCount = await ChatMessage.countDocuments({
      projectId,
      createdAt: { $gt: lastRead },
      sender: { $ne: userId },
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   POST /api/v1/chat/:projectId/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    // Update user's last read timestamp for this project
    if (!req.user.lastReadAt) {
      req.user.lastReadAt = new Map();
    }
    req.user.lastReadAt.set(projectId, new Date());
    await req.user.save();

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("chat:read", {
      userId,
      projectId,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  getOnlineUsers,
  getUnreadCount,
  markAsRead,
};
