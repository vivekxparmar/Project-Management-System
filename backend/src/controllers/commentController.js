const Comment = require("../models/Comment");
const Bug = require("../models/Bug");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const { AUDIT_ACTIONS } = require("../utils/constants");
const { sendNotificationEmail } = require("../services/emailService");

// @desc    Add comment to bug
// @route   POST /api/v1/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { content, bugId, mentions } = req.body;
    const io = req.app.get("io");

    const comment = await Comment.create({
      content,
      bugId,
      author: req.user._id,
      mentions: mentions || [],
    });

    const bug = await Bug.findById(bugId);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    bug.comments.push(comment._id);
    await bug.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate("author", "name email avatar")
      .lean();

    io.to(`project:${bug.projectId}`).emit("comment:added", {
      comment: populatedComment,
      bugId,
      addedBy: req.user.name,
    });

    res.status(201).json({
      success: true,
      data: populatedComment,
    });

    AuditLog.create({
      projectId: bug.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "comment",
      entityId: comment._id,
      entityName: "Comment",
      changes: { content },
    }).catch((err) => console.error("Audit log failed:", err));

    const notifyUsers = new Set();

    if (
      bug.reportedBy &&
      bug.reportedBy.toString() !== req.user._id.toString()
    ) {
      notifyUsers.add(bug.reportedBy.toString());
    }

    if (bug.assignee && bug.assignee.toString() !== req.user._id.toString()) {
      notifyUsers.add(bug.assignee.toString());
    }

    if (mentions && Array.isArray(mentions)) {
      mentions.forEach((mention) => {
        if (mention.toString() !== req.user._id.toString()) {
          notifyUsers.add(mention.toString());
        }
      });
    }

    Promise.all(
      [...notifyUsers].map(async (userId) => {
        try {
          // Create notification
          const notification = await Notification.create({
            userId,
            projectId: bug.projectId,
            type: "mention",
            title: "New Comment on Bug",
            message: `${req.user.name} commented on bug ${bug.bugNumber}: "${bug.title}"`,
            sender: req.user._id,
            data: {
              bugId,
              commentId: comment._id,
              bugNumber: bug.bugNumber,
            },
          });

          const populatedNotification = await Notification.findById(
            notification._id,
          )
            .populate("sender", "name email avatar")
            .populate("projectId", "name")
            .lean();

          io.to(`user:${userId}`).emit(
            "notification:new",
            populatedNotification,
          );

          const user = await User.findById(userId).select("email name").lean();

          if (user?.email) {
            sendNotificationEmail(
              user.email,
              user.name,
              `New Comment on Bug ${bug.bugNumber}`,
              `${req.user.name} commented: "${content.substring(0, 100)}${
                content.length > 100 ? "..." : ""
              }"`,
              `${process.env.FRONTEND_URL}/projects/${bug.projectId}/bugs/${bug._id}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        } catch (err) {
          console.error("Background notification failed:", err);
        }
      }),
    ).catch((err) => console.error("Background jobs failed:", err));
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments for a bug
// @route   GET /api/v1/comments/:bugId
// @access  Private
const getAllBugComments = async (req, res, next) => {
  try {
    const { bugId } = req.params;

    const bug = await Bug.findById(bugId);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    const comments = await Comment.find({ bugId })
      .populate("author", "name email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update comment
// @route   PUT /api/v1/comments/:id
// @access  Private (author only)
const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const commentId = req.params.id;

    let comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is author
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    const bug = await Bug.findById(comment.bugId);

    const projectId = req.body.projectId || bug.projectId;

    // Create audit log
    await AuditLog.create({
      projectId: bug.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "comment",
      entityId: comment._id,
      entityName: "Comment",
      changes: { content },
    });

    const populatedComment = await Comment.findById(commentId).populate(
      "author",
      "name email avatar",
    );

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${bug.projectId}`).emit("comment:updated", {
      comment: populatedComment,
      updatedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
// @access  Private (author or admin)
const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const bug = await Bug.findById(comment.bugId);

    const projectId = req.body.projectId || bug.projectId;

    // Check if user is author or admin
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Admin" || req.user.role === "Owner";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    // Remove comment from bug
    bug.comments = bug.comments.filter((id) => id.toString() !== commentId);
    await bug.save();

    // Create audit log
    await AuditLog.create({
      projectId: bug.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "comment",
      entityId: comment._id,
      entityName: "Comment",
      changes: { deleted: true },
    });

    await comment.deleteOne();

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${bug.projectId}`).emit("comment:deleted", {
      commentId,
      bugId: comment.bugId,
      deletedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getAllBugComments,
  updateComment,
  deleteComment,
};
