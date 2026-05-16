const ChatMessage = require("../../models/ChatMessage");
const User = require("../../models/User");
const NotificationService = require("../../services/notificationService");
const { NOTIFICATION_TYPES } = require("../../utils/constants");

// Store typing users per project with timeouts
const typingUsers = new Map();

const setupChatHandlers = (io, socket) => {
  const userId = socket.user._id.toString();
  const userName = socket.user.name;

  // Handle send message
  socket.on("chat:message", async (data) => {
    try {
      const { projectId, content, type, attachments, mentions } = data;

      if (
        !projectId ||
        (!content && (!attachments || attachments.length === 0))
      ) {
        socket.emit("chat:error", { message: "Invalid message data" });
        return;
      }

      const message = await ChatMessage.create({
        projectId,
        sender: socket.user._id,
        senderName: userName,
        senderAvatar: socket.user.avatar,
        content: content || "",
        type: type || "text",
        attachments: attachments || [],
        mentions: mentions || [],
      });

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

      // Broadcast to all users in the project room
      io.to(`project:${projectId}`).emit("chat:message", {
        message: populatedMessage,
        projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("chat:error", { message: "Failed to send message" });
    }
  });

  // Handle edit message
  socket.on("chat:edit", async (data) => {
    try {
      const { messageId, content } = data;

      const message = await ChatMessage.findById(messageId);
      if (!message) {
        socket.emit("chat:error", { message: "Message not found" });
        return;
      }

      // Check if user is the sender
      if (message.sender.toString() !== userId) {
        socket.emit("chat:error", {
          message: "You can only edit your own messages",
        });
        return;
      }

      // Check if message is less than 10 minutes old
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      if (messageAge > 10 * 60 * 1000) {
        socket.emit("chat:error", {
          message: "Messages can only be edited within 10 minutes",
        });
        return;
      }

      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      const populatedMessage = await ChatMessage.findById(messageId).populate(
        "sender",
        "name email avatar",
      );

      io.to(`project:${message.projectId}`).emit("chat:messageEdited", {
        message: populatedMessage,
        editedBy: userName,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error editing message:", error);
      socket.emit("chat:error", { message: "Failed to edit message" });
    }
  });

  // Handle delete message
  socket.on("chat:delete", async (data) => {
    try {
      const { messageId } = data;

      const message = await ChatMessage.findById(messageId);
      if (!message) {
        socket.emit("chat:error", { message: "Message not found" });
        return;
      }

      // Check if user is sender or admin
      const isSender = message.sender.toString() === userId;
      const isAdmin =
        socket.user.role === "Admin" || socket.user.role === "Owner";

      if (!isSender && !isAdmin) {
        socket.emit("chat:error", {
          message: "You can only delete your own messages",
        });
        return;
      }

      // Soft delete
      message.deletedAt = new Date();
      message.content = "This message was deleted";
      await message.save();

      io.to(`project:${message.projectId}`).emit("chat:messageDeleted", {
        messageId,
        deletedBy: userName,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("chat:error", { message: "Failed to delete message" });
    }
  });

  // Handle typing indicators 
  socket.on("chat:typing", async (data) => {
    const { projectId, isTyping } = data;

    if (!projectId) return;

    // Initialize typing map for project if not exists
    if (!typingUsers.has(projectId)) {
      typingUsers.set(projectId, new Map());
    }

    const projectTyping = typingUsers.get(projectId);

    if (isTyping) {
      // Clear existing timeout if any
      const existingTimeout = projectTyping.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Add user to typing set
      projectTyping.set(
        userId,
        setTimeout(() => {
          // Auto-stop typing after 3 seconds of no activity
          projectTyping.delete(userId);
          socket.to(`project:${projectId}`).emit("chat:typing", {
            userId,
            userName,
            isTyping: false,
            projectId,
          });
        }, 3000),
      );

      // Broadcast typing start
      socket.to(`project:${projectId}`).emit("chat:typing", {
        userId,
        userName,
        isTyping: true,
        projectId,
      });
    } else {
      // Clear timeout and remove user
      const timeout = projectTyping.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        projectTyping.delete(userId);
      }

      // Broadcast typing stop
      socket.to(`project:${projectId}`).emit("chat:typing", {
        userId,
        userName,
        isTyping: false,
        projectId,
      });
    }
  });

  // Handle message reactions
  socket.on("chat:react", async (data) => {
    try {
      const { messageId, reaction, projectId } = data;

      const message = await ChatMessage.findById(messageId);
      if (!message || message.deletedAt) {
        socket.emit("chat:error", { message: "Message not found" });
        return;
      }

      if (!message.reactions) {
        message.reactions = new Map();
      }

      const userReaction = message.reactions.get(userId);
      if (userReaction === reaction) {
        // Remove reaction if same
        message.reactions.delete(userId);
      } else {
        // Add or update reaction
        message.reactions.set(userId, reaction);
      }

      await message.save();

      io.to(`project:${projectId}`).emit("chat:reaction", {
        messageId,
        userId,
        userName,
        reaction,
        projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
      socket.emit("chat:error", { message: "Failed to add reaction" });
    }
  });

  // Handle message read receipts
  socket.on("chat:read", async (data) => {
    try {
      const { projectId, messageId } = data;

      // Update user's last read timestamp
      if (!socket.user.lastReadAt) {
        socket.user.lastReadAt = new Map();
      }
      socket.user.lastReadAt.set(projectId, new Date());
      await socket.user.save();

      // Notify others that user has read messages
      socket.to(`project:${projectId}`).emit("chat:readReceipt", {
        userId,
        userName,
        messageId,
        projectId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  });

  // Handle fetching more messages (pagination)
  socket.on("chat:loadMore", async (data) => {
    try {
      const { projectId, before, limit = 50 } = data;

      const query = { projectId, deletedAt: null };
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await ChatMessage.find(query)
        .populate("sender", "name email avatar")
        .sort({ createdAt: -1 })
        .limit(limit);

      socket.emit("chat:history", {
        messages: messages.reverse(),
        projectId,
        hasMore: messages.length === limit,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error loading more messages:", error);
      socket.emit("chat:error", { message: "Failed to load messages" });
    }
  });

  // Handle searching messages
  socket.on("chat:search", async (data) => {
    try {
      const { projectId, query, limit = 50 } = data;

      if (!query || query.length < 2) {
        socket.emit("chat:error", {
          message: "Search query must be at least 2 characters",
        });
        return;
      }

      const messages = await ChatMessage.find({
        projectId,
        content: { $regex: query, $options: "i" },
        deletedAt: null,
      })
        .populate("sender", "name email avatar")
        .sort({ createdAt: -1 })
        .limit(limit);

      socket.emit("chat:searchResults", {
        query,
        messages,
        projectId,
        count: messages.length,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error searching messages:", error);
      socket.emit("chat:error", { message: "Failed to search messages" });
    }
  });

  // Handle get unread count
  socket.on("chat:getUnread", async (data) => {
    try {
      const { projectId } = data;

      const lastRead = socket.user.lastReadAt?.get(projectId) || new Date(0);
      const unreadCount = await ChatMessage.countDocuments({
        projectId,
        createdAt: { $gt: lastRead },
        sender: { $ne: socket.user._id },
        deletedAt: null,
      });

      socket.emit("chat:unreadCount", {
        projectId,
        count: unreadCount,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error getting unread count:", error);
    }
  });
};

module.exports = { setupChatHandlers };
