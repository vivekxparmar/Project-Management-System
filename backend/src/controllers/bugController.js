const Bug = require("../models/Bug");
const Comment = require("../models/Comment");
const Project = require("../models/Project");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const {
  BUG_STATUS,
  PRIORITIES,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require("../utils/constants");
const { sendNotificationEmail } = require("../services/emailService");
const cloudinary = require("../config/cloudinary");
const fs = require("fs").promises;

// Helper to upload to Cloudinary
const uploadToCloudinary = async (file, folder) => {
  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: "auto",
  });
  await fs.unlink(file.path).catch(console.error);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    type: file.mimetype.startsWith("image/") ? "image" : "file",
    originalName: file.originalname,
  };
};

// Helper to upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );

    const { Readable } = require("stream");
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

const emitNotification = async (io, notificationDoc) => {
  const populatedNotification = await Notification.findById(notificationDoc._id)
    .populate("sender", "name email avatar")
    .populate("projectId", "name")
    .lean();

  io.to(`user:${notificationDoc.userId.toString()}`).emit(
    "notification:new",
    populatedNotification,
  );
};

// @desc    Report a new bug (JSON only, no files)
// @route   POST /api/v1/bugs
// @access  Private
const reportBug = async (req, res, next) => {
  try {
    const { title, description, priority, assignee, projectId, attachments } =
      req.body;

    const io = req.app.get("io");

    // 1. Create bug
    const bug = await Bug.create({
      title,
      description: description || "",
      priority: priority || PRIORITIES.P3,
      projectId,
      reportedBy: req.user._id,
      assignee: assignee || null,
      status: BUG_STATUS.OPEN,
      attachments: attachments || [],
    });

    // 2. Fire and forget audit log
    AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "bug",
      entityId: bug._id,
      entityName: bug.bugNumber,
      changes: { title, description, priority, assignee },
    }).catch((err) => console.error("Audit log failed:", err));

    // 3. Get project members efficiently
    const project = await Project.findById(projectId)
      .select("members owner")
      .lean();

    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner.toString());
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    // 4. Send notifications in background
    if (uniqueMemberIds.length > 0) {
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId,
        type: NOTIFICATION_TYPES.BUG_REPORTED,
        title: "New Bug Reported",
        message: `${req.user.name} reported bug ${bug.bugNumber}: "${title}"`,
        sender: req.user._id,
        data: {
          bugId: bug._id,
          bugNumber: bug.bugNumber,
          bugTitle: title,
          priority: priority || PRIORITIES.P3,
        },
        createdAt: new Date(),
      }));

      Notification.insertMany(notifications)
        .then(async (createdNotifications) => {
          const notificationIds = createdNotifications.map(
            (notification) => notification._id,
          );

          const populatedNotifications = await Notification.find({
            _id: { $in: notificationIds },
          })
            .populate("sender", "name email avatar")
            .populate("projectId", "name");

          populatedNotifications.forEach((notification) => {
            io.to(`user:${notification.userId}`).emit(
              "notification:new",
              notification,
            );
          });
        })
        .catch((err) => console.error("Failed to create notifications:", err));
    }

    // 5. Send email notifications in background
    const adminMembers = project.members.filter(
      (m) => m.role === "Admin" || m.role === "Owner",
    );

    const emailRecipientIds = new Set();
    adminMembers.forEach((m) => emailRecipientIds.add(m.user.toString()));

    if (assignee) {
      emailRecipientIds.add(assignee.toString());
    }

    // Remove reporter from email recipients
    emailRecipientIds.delete(req.user._id.toString());

    // Send emails in background
    Promise.all(
      Array.from(emailRecipientIds).map(async (userId) => {
        const user = await User.findById(userId).select("email name").lean();
        if (user?.email) {
          sendNotificationEmail(
            user.email,
            user.name,
            `New Bug Reported: ${bug.bugNumber}`,
            `${req.user.name} reported a new bug: "${title}". Priority: ${priority || "P3"}.`,
            `${process.env.FRONTEND_URL}/projects/${projectId}/bugs/${bug._id}`,
          ).catch((err) => console.error("Email failed:", err));
        }
      }),
    ).catch((err) => console.error("Email sending failed:", err));

    // 6. Populate bug for response
    const populatedBug = await Bug.findById(bug._id)
      .populate("reportedBy", "name email avatar")
      .populate("assignee", "name email avatar")
      .lean();

    // 7. Send real-time update (fire and forget)

    io.to(`project:${projectId}`).emit("bug:created", {
      bug: populatedBug,
      reportedBy: req.user.name,
    });

    // 8. Send immediate response
    res.status(201).json({
      success: true,
      data: populatedBug,
    });
  } catch (error) {
    console.error("Report bug error:", error);
    next(error);
  }
};

// @desc    Get all bugs for a project
// @route   GET /api/v1/bugs/project/:projectId
// @access  Private
const getBugsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee } = req.query;

    let query = { projectId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;

    const bugs = await Bug.find(query)
      .populate("reportedBy", "name email avatar")
      .populate("assignee", "name email avatar")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: bugs.length,
      data: bugs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bug
// @route   GET /api/v1/bugs/:id
// @access  Private
const getBug = async (req, res, next) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate("reportedBy", "name email avatar")
      .populate("assignee", "name email avatar")
      .populate({
        path: "comments",
        populate: { path: "author", select: "name email avatar" },
      });

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    res.status(200).json({
      success: true,
      data: bug,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bug
// @route   PUT /api/v1/bugs/:id
// @access  Private
const updateBug = async (req, res, next) => {
  try {
    const { title, description, priority, assigneeId, status } = req.body;

    const bugId = req.params.id;
    const io = req.app.get("io");

    let bug = await Bug.findById(bugId)
      .select(
        "title description priority assignee status projectId bugNumber reportedBy resolvedAt",
      )
      .lean();

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    const changes = {};

    const oldAssigneeId = bug.assignee?.toString();
    const newAssigneeId = assigneeId;

    if (title !== undefined && title !== bug.title) {
      changes.title = {
        old: bug.title,
        new: title,
      };
    }

    if (description !== undefined && description !== bug.description) {
      changes.description = {
        old: bug.description,
        new: description,
      };
    }

    if (priority !== undefined && priority !== bug.priority) {
      changes.priority = {
        old: bug.priority,
        new: priority,
      };
    }

    if (assigneeId !== undefined && assigneeId !== oldAssigneeId) {
      changes.assignee = {
        old: oldAssigneeId,
        new: newAssigneeId,
      };
    }

    // Handle status change

    let resolvedAt = bug.resolvedAt;

    if (status !== undefined && status !== bug.status) {
      changes.status = {
        old: bug.status,
        new: status,
      };

      if (status === BUG_STATUS.FIXED || status === BUG_STATUS.CLOSED) {
        resolvedAt = new Date();
      }
    }

    // Prepare update data

    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(priority !== undefined && { priority }),
      ...(assigneeId !== undefined && {
        assignee: assigneeId,
      }),
      ...(status !== undefined && { status }),
      ...(resolvedAt !== undefined && { resolvedAt }),
    };

    // Update bug

    let updatedBug = bug;

    if (Object.keys(changes).length > 0) {
      updatedBug = await Bug.findByIdAndUpdate(bugId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("reportedBy assignee", "name email avatar")
        .lean();
    } else {
      updatedBug = await Bug.findById(bugId)
        .populate("reportedBy assignee", "name email avatar")
        .lean();
    }

    // Audit log

    if (Object.keys(changes).length > 0) {
      AuditLog.create({
        projectId: bug.projectId,
        user: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "bug",
        entityId: bug._id,
        entityName: bug.bugNumber,
        changes,
      }).catch((err) => console.error("Audit log failed:", err));
    }

    // Background operations

    const backgroundOps = [];

    // Helper function

    const sendBugUpdateNotification = async (userId) => {
      if (!userId || userId.toString() === req.user._id.toString()) {
        return;
      }

      try {
        const notification = await Notification.create({
          userId,
          projectId: bug.projectId,
          type: NOTIFICATION_TYPES.BUG_UPDATED,
          title: "Bug Updated",
          message: `${req.user.name} updated bug ${bug.bugNumber}`,
          sender: req.user._id,
          data: {
            bugId: bug._id,
            bugNumber: bug.bugNumber,
            changes,
          },
        });

        await emitNotification(io, notification);

        const user = await User.findById(userId).select("email name").lean();

        if (user?.email) {
          await sendNotificationEmail(
            user.email,
            user.name,
            `Bug Updated: ${bug.bugNumber}`,
            `Bug "${bug.title}" has been updated by ${req.user.name}.`,
            `${process.env.FRONTEND_URL}/projects/${bug.projectId}/bugs/${bug._id}`,
          );
        }
      } catch (err) {
        console.error("Bug update notification failed:", err);
      }
    };

    // ASSIGNMENT NOTIFICATIONS

    if (changes.assignee) {
      const oldAssigneeIdVal = changes.assignee.old;

      const newAssigneeIdVal = changes.assignee.new;

      // Notify new assignee
      if (
        newAssigneeIdVal &&
        newAssigneeIdVal.toString() !== req.user._id.toString()
      ) {
        backgroundOps.push(
          Notification.create({
            userId: newAssigneeIdVal,
            projectId: bug.projectId,
            type: NOTIFICATION_TYPES.BUG_ASSIGNED,
            title: "Bug Assigned to You",
            message: `You have been assigned to bug ${bug.bugNumber}: "${bug.title}"`,
            sender: req.user._id,
            data: {
              bugId: bug._id,
              bugNumber: bug.bugNumber,
              bugTitle: bug.title,
            },
          })
            .then(async (notification) => {
              await emitNotification(io, notification);

              const assigneeUser = await User.findById(newAssigneeIdVal)
                .select("email name")
                .lean();

              if (assigneeUser?.email) {
                await sendNotificationEmail(
                  assigneeUser.email,
                  assigneeUser.name,
                  `Bug Assigned: ${bug.bugNumber}`,
                  `You have been assigned to bug "${bug.title}". Priority: ${updatedBug.priority || bug.priority}.`,
                  `${process.env.FRONTEND_URL}/projects/${bug.projectId}/bugs/${bug._id}`,
                );
              }
            })
            .catch((err) => console.error("Assign notification failed:", err)),
        );
      }

      // Notify old assignee
      if (
        oldAssigneeIdVal &&
        oldAssigneeIdVal.toString() !== req.user._id.toString()
      ) {
        backgroundOps.push(
          Notification.create({
            userId: oldAssigneeIdVal,
            projectId: bug.projectId,
            type: NOTIFICATION_TYPES.BUG_UNASSIGNED,
            title: "Bug Unassigned",
            message: `You have been unassigned from bug ${bug.bugNumber}: "${bug.title}"`,
            sender: req.user._id,
            data: {
              bugId: bug._id,
              bugNumber: bug.bugNumber,
              bugTitle: bug.title,
            },
          })
            .then(async (notification) => {
              await emitNotification(io, notification);

              const oldAssignee = await User.findById(oldAssigneeIdVal)
                .select("email name")
                .lean();

              if (oldAssignee?.email) {
                await sendNotificationEmail(
                  oldAssignee.email,
                  oldAssignee.name,
                  `Bug Unassigned: ${bug.bugNumber}`,
                  `You have been unassigned from bug "${bug.title}".`,
                  `${process.env.FRONTEND_URL}/projects/${bug.projectId}/bugs/${bug._id}`,
                );
              }
            })
            .catch((err) =>
              console.error("Unassign notification failed:", err),
            ),
        );
      }
    }

    // GENERAL UPDATE NOTIFICATIONS

    const nonAssignmentChanges = {
      ...changes,
    };

    delete nonAssignmentChanges.assignee;

    if (Object.keys(nonAssignmentChanges).length > 0) {
      const recipients = new Set();

      // Reporter
      if (bug.reportedBy) {
        recipients.add(bug.reportedBy.toString());
      }

      // Current assignee
      const currentAssignee = updatedBug.assignee?._id || updatedBug.assignee;

      if (currentAssignee) {
        recipients.add(currentAssignee.toString());
      }

      // Remove updater
      recipients.delete(req.user._id.toString());

      for (const userId of recipients) {
        backgroundOps.push(sendBugUpdateNotification(userId));
      }
    }

    Promise.all(backgroundOps).catch((err) =>
      console.error("Background ops failed:", err),
    );

    io.to(`project:${bug.projectId}`).emit("bug:updated", {
      bug: updatedBug,
      changes,
      updatedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: updatedBug,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bug
// @route   DELETE /api/v1/bugs/:id
// @access  Private
const deleteBug = async (req, res, next) => {
  try {
    const bugId = req.params.id;
    const io = req.app.get("io");

    // 1. Get bug with essential fields
    const bug = await Bug.findById(bugId)
      .select("title bugNumber projectId assignee reportedBy attachments")
      .lean();

    const projectId = req.body.projectId || bug?.projectId;

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    // 2. Store details for notifications
    const bugTitle = bug.title;
    const bugNumber = bug.bugNumber;
    const bugAssignee = bug.assignee;
    const bugReporter = bug.reportedBy;
    const bugProjectId = bug.projectId;

    // 3. Delete attachments from cloudinary in background
    const attachmentDeletions = bug.attachments
      .filter((attachment) => attachment.publicId)
      .map((attachment) =>
        cloudinary.uploader
          .destroy(attachment.publicId)
          .catch((err) => console.error("Failed to delete attachment:", err)),
      );

    Promise.all(attachmentDeletions).catch((err) =>
      console.error("Attachment deletion failed:", err),
    );

    // 4. Delete comments in background
    Comment.deleteMany({ bugId }).catch((err) =>
      console.error("Failed to delete comments:", err),
    );

    // 5. Prepare background operations
    const backgroundOps = [];

    // 6. Notify assignee (if exists and not the deleter)
    if (bugAssignee && bugAssignee.toString() !== req.user._id.toString()) {
      backgroundOps.push(
        Notification.create({
          userId: bugAssignee,
          projectId: bugProjectId,
          type: NOTIFICATION_TYPES.BUG_DELETED,
          title: "Bug Deleted",
          message: `Bug ${bugNumber}: "${bugTitle}" has been deleted by ${req.user.name}`,
          sender: req.user._id,
          data: {
            bugId: bug._id,
            bugNumber: bugNumber,
            bugTitle: bugTitle,
            deletedBy: req.user.name,
          },
        })
          .then(async (notification) => {
            await emitNotification(io, notification);
          })
          .catch((err) => console.error("Assignee notification failed:", err)),
      );

      // Send email to assignee
      User.findById(bugAssignee)
        .select("email name")
        .lean()
        .then((assigneeUser) => {
          if (assigneeUser?.email) {
            sendNotificationEmail(
              assigneeUser.email,
              assigneeUser.name,
              `Bug Deleted: ${bugNumber}`,
              `Bug "${bugTitle}" has been deleted by ${req.user.name}.`,
              `${process.env.FRONTEND_URL}/projects/${bugProjectId}/bugs`,
            ).catch((err) => console.error("Email failed:", err));
          }
        })
        .catch((err) => console.error("Failed to get assignee:", err));
    }

    // 7. Notify reporter (if exists and not the deleter)
    if (bugReporter && bugReporter.toString() !== req.user._id.toString()) {
      backgroundOps.push(
        Notification.create({
          userId: bugReporter,
          projectId: bugProjectId,
          type: NOTIFICATION_TYPES.BUG_DELETED,
          title: "Bug Deleted",
          message: `Bug ${bugNumber}: "${bugTitle}" has been deleted by ${req.user.name}`,
          sender: req.user._id,
          data: {
            bugId: bug._id,
            bugNumber: bugNumber,
            bugTitle: bugTitle,
            deletedBy: req.user.name,
          },
        })
          .then(async (notification) => {
            await emitNotification(io, notification);
          })
          .catch((err) => console.error("Reporter notification failed:", err)),
      );

      // Send email to reporter
      User.findById(bugReporter)
        .select("email name")
        .lean()
        .then((reporterUser) => {
          if (reporterUser?.email) {
            sendNotificationEmail(
              reporterUser.email,
              reporterUser.name,
              `Bug Deleted: ${bugNumber}`,
              `Bug "${bugTitle}" which you reported has been deleted by ${req.user.name}.`,
              `${process.env.FRONTEND_URL}/projects/${bugProjectId}/bugs`,
            ).catch((err) => console.error("Email failed:", err));
          }
        })
        .catch((err) => console.error("Failed to get reporter:", err));
    }

    // 9. Fire and forget audit log
    AuditLog.create({
      projectId: bugProjectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "bug",
      entityId: bug._id,
      entityName: bugNumber,
      changes: { deleted: true },
    }).catch((err) => console.error("Audit log failed:", err));

    // 10. Delete the bug (blocking operation)
    await Bug.findByIdAndDelete(bugId);

    // 11. Fire all background operations
    Promise.all(backgroundOps).catch((err) =>
      console.error("Background ops failed:", err),
    );

    // 12. Send real-time update (fire and forget)

    io.to(`project:${bugProjectId}`).emit("bug:deleted", {
      bugId,
      bugNumber: bugNumber,
      deletedBy: req.user.name,
    });

    // 13. Send immediate response
    res.status(200).json({
      success: true,
      message: "Bug deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add attachment to bug
// @route   POST /api/v1/bugs/:id/attachments
// @access  Private
const addAttachment = async (req, res, next) => {
  try {
    const bugId = req.params.id;
    const files = req.files || [];
    const projectId = req.body.projectId;

    const bug = await Bug.findById(bugId);
    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const newAttachments = [];

    for (const file of files) {
      try {
        // Upload from buffer directly to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `bugs/${bug.bugNumber}`,
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );

          // Create a readable stream from the buffer
          const { Readable } = require("stream");
          const readableStream = Readable.from(file.buffer);
          readableStream.pipe(uploadStream);
        });

        newAttachments.push({
          url: result.secure_url,
          publicId: result.public_id,
          type: file.mimetype.startsWith("image/") ? "image" : "file",
          originalName: file.originalname,
        });
      } catch (error) {
        console.error("Failed to upload file:", error);
        // Continue with next file even if one fails
      }
    }

    bug.attachments.push(...newAttachments);
    await bug.save();

    await AuditLog.create({
      projectId: bug.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "bug",
      entityId: bug._id,
      entityName: bug.bugNumber,
      changes: { attachments: `Added ${newAttachments.length} file(s)` },
    });

    const io = req.app.get("io");
    io.to(`project:${bug.projectId}`).emit("bug:attachmentsAdded", {
      bugId,
      attachments: newAttachments,
      addedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: bug.attachments,
    });
  } catch (error) {
    console.error("Add attachment error:", error);
    next(error);
  }
};

// @desc    Remove attachment from bug
// @route   DELETE /api/v1/bugs/:bugId/attachments/:attachmentId
// @access  Private
const removeAttachment = async (req, res, next) => {
  try {
    const { bugId, attachmentId } = req.params;

    const bug = await Bug.findById(bugId);

    const projectId = req.body.projectId || bug?.projectId;
    if (!bug) {
      return res.status(404).json({
        success: false,
        message: "Bug not found",
      });
    }

    const attachment = bug.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    if (attachment.publicId) {
      await cloudinary.uploader.destroy(attachment.publicId);
    }

    attachment.remove();
    await bug.save();

    const io = req.app.get("io");
    io.to(`project:${bug.projectId}`).emit("bug:attachmentRemoved", {
      bugId,
      attachmentId,
      removedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Attachment removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reportBug,
  getBugsByProject,
  getBug,
  updateBug,
  deleteBug,
  addAttachment,
  removeAttachment,
};
