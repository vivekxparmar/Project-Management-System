const Project = require("../models/Project");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  PROJECT_STATUS,
  USER_ROLES,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require("../utils/constants");
const { sendNotificationEmail } = require("../services/emailService");
const Notification = require("../models/Notification");

// @desc    Create a new project
// @route   POST /api/v1/projects
// @access  Private
const createProject = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;
    const userId = req.user._id;

    const project = await Project.create({
      name,
      description: description || "",
      status: status || PROJECT_STATUS.NOT_STARTED,
      owner: userId,
      members: [
        {
          user: req.user,
          role: USER_ROLES.OWNER,
          joinedAt: new Date(),
        },
      ],
    });

    // Add project to user's projects list
    await User.findByIdAndUpdate(userId, {
      $push: {
        projects: {
          projectId: project._id,
          role: USER_ROLES.OWNER,
          joinedAt: new Date(),
        },
      },
    });

    // Create audit log
    await AuditLog.create({
      projectId: project._id,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { name, description, status },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all projects for a user
// @route   GET /api/v1/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { includeArchived = false } = req.query;

    let query = {
      isDeleted: false,
      "members.user": userId,
    };

    if (includeArchived !== "true") {
      query.isArchived = false;
    }

    const projects = await Project.find(query)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar role")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/v1/projects/:id
// @access  Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar role");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user is a member
    const isMember = project.members.some(
      (member) => member.user._id.toString() === req.user._id.toString(),
    );

    if (!isMember && project.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this project",
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/v1/projects/:id
// @access  Private (Owner/Admin only)
const updateProject = async (req, res, next) => {
  try {
    const { name, description, status, settings } = req.body;
    const projectId = req.params.projectId;
    const userId = req.user._id;

    const io = req.app.get("io");

    let project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permission
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = project.members.some(
      (member) =>
        member.user.toString() === userId.toString() &&
        member.role === USER_ROLES.ADMIN,
    );

    if (!isOwner && !isAdmin && req.user.role !== USER_ROLES.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only project owner or admin can update project",
      });
    }

    // Track changes for audit log
    const changes = {};
    if (name && name !== project.name)
      changes.name = { old: project.name, new: name };
    if (description && description !== project.description)
      changes.description = { old: project.description, new: description };
    if (status && status !== project.status)
      changes.status = { old: project.status, new: status };

    // Build update payload
    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (status) updatePayload.status = status;

    // Merge settings fields individually to avoid overwriting unrelated settings
    if (settings) {
      if (settings.defaultSprintDuration !== undefined) {
        updatePayload["settings.defaultSprintDuration"] =
          settings.defaultSprintDuration;
        if (
          settings.defaultSprintDuration !==
          project.settings?.defaultSprintDuration
        )
          changes.defaultSprintDuration = {
            old: project.settings?.defaultSprintDuration,
            new: settings.defaultSprintDuration,
          };
      }
      if (settings.defaultTaskEstimate !== undefined) {
        updatePayload["settings.defaultTaskEstimate"] =
          settings.defaultTaskEstimate;
        if (
          settings.defaultTaskEstimate !== project.settings?.defaultTaskEstimate
        )
          changes.defaultTaskEstimate = {
            old: project.settings?.defaultTaskEstimate,
            new: settings.defaultTaskEstimate,
          };
      }
      if (settings.defaultPriority !== undefined) {
        updatePayload["settings.defaultPriority"] = settings.defaultPriority;
        if (settings.defaultPriority !== project.settings?.defaultPriority)
          changes.defaultPriority = {
            old: project.settings?.defaultPriority,
            new: settings.defaultPriority,
          };
      }
      if (settings.customLabels !== undefined) {
        updatePayload["settings.customLabels"] = settings.customLabels;
      }
      if (settings.integrations !== undefined) {
        if (settings.integrations.github !== undefined) {
          updatePayload["settings.integrations.github"] =
            settings.integrations.github;
          if (
            settings.integrations.github !==
            project.settings?.integrations?.github
          )
            changes.github = {
              old: project.settings?.integrations?.github,
              new: settings.integrations.github,
            };
        }
        if (settings.integrations.slackWebhook !== undefined) {
          updatePayload["settings.integrations.slackWebhook"] =
            settings.integrations.slackWebhook;
          if (
            settings.integrations.slackWebhook !==
            project.settings?.integrations?.slackWebhook
          )
            changes.slackWebhook = {
              old: project.settings?.integrations?.slackWebhook,
              new: settings.integrations.slackWebhook,
            };
        }
      }
    }

    project = await Project.findByIdAndUpdate(
      projectId,
      { $set: updatePayload },
      { returnDocument: "after", runValidators: true },
    )
      .populate("owner", "name email avatar role")
      .populate("members.user", "name email avatar role isOnline lastSeen");

    await AuditLog.create({
      projectId,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes,
    });

    const memberIds = project.members
      .map((m) => m.user._id || m.user)
      .filter((memberId) => memberId.toString() !== userId.toString());

    const uniqueMemberIds = [...new Set(memberIds.map((id) => id.toString()))];

    if (uniqueMemberIds.length > 0 && Object.keys(changes).length > 0) {
      // Create a readable summary of changes
      const changeSummary = Object.keys(changes)
        .map((key) => {
          if (key === "name") return `name to "${changes.name.new}"`;
          if (key === "description") return "description";
          if (key === "status") return `status to ${changes.status.new}`;
          if (key === "defaultSprintDuration")
            return `sprint duration to ${changes.defaultSprintDuration.new} days`;
          if (key === "defaultTaskEstimate")
            return `task estimate to ${changes.defaultTaskEstimate.new} hours`;
          if (key === "defaultPriority")
            return `default priority to ${changes.defaultPriority.new}`;
          return key;
        })
        .join(", ");

      await Notification.insertMany(
        uniqueMemberIds.map((memberId) => ({
          userId: memberId,
          projectId,
          type: NOTIFICATION_TYPES.PROJECT_UPDATED,
          title: "Project Updated",
          message: `${req.user.name} updated ${changeSummary ? `: ${changeSummary}` : "the project"}`,
          sender: req.user._id,
          data: {
            projectId: project._id,
            projectName: project.name,
            changes: changes,
            updatedBy: req.user.name,
          },
        })),
      )
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

    io.to(`project:${projectId}`).emit("project:updated", project);

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive project (soft delete)
// @route   PUT /api/v1/projects/:id/archive
// @access  Private (Owner/Admin only)
const archiveProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user._id;

    let project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permission
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = project.members.some(
      (member) =>
        member.user.toString() === userId.toString() &&
        member.role === USER_ROLES.ADMIN,
    );

    if (!isOwner && !isAdmin && req.user.role !== USER_ROLES.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only project owner or admin can archive project",
      });
    }

    project.isArchived = true;
    await project.save();

    // Create audit log
    await AuditLog.create({
      projectId,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.ARCHIVE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { isArchived: true },
    });

    // Notify team members
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:archived", {
      projectId,
      isArchived: project.isArchived,
      projectName: project.name,
      archivedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Project archived successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore archived project
// @route   PUT /api/v1/projects/:id/restore
// @access  Private (Owner/Admin only)
const restoreProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user._id;

    let project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permission
    const isOwner = project.owner.toString() === userId.toString();
    const isAdmin = project.members.some(
      (member) =>
        member.user.toString() === userId.toString() &&
        member.role === USER_ROLES.ADMIN,
    );

    if (!isOwner && !isAdmin && req.user.role !== USER_ROLES.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only project owner or admin can restore project",
      });
    }

    project.isArchived = false;
    await project.save();

    // Create audit log
    await AuditLog.create({
      projectId,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.RESTORE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { isArchived: false },
    });

    // Notify team members
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:restored", {
      projectId,
      projectName: project.name,
      restoredBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Project restored successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete project
// @route   DELETE /api/v1/projects/:id
// @access  Private (Owner only)
const deleteProject = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user._id;

    let project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Only owner can delete
    if (
      project.owner.toString() !== userId.toString() &&
      req.user.role !== USER_ROLES.OWNER
    ) {
      return res.status(403).json({
        success: false,
        message: "Only project owner can delete project",
      });
    }

    project.isDeleted = true;
    project.deletedAt = new Date();
    await project.save();

    // Remove this project from all users who have it in their projects[]
    await User.updateMany(
      { "projects.projectId": project._id },
      {
        $pull: {
          projects: { projectId: project._id },
        },
      },
    );

    // Create audit log
    await AuditLog.create({
      projectId,
      user: userId,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { isDeleted: true, deletedAt: new Date() },
    });

    // Notify team members
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:deleted", {
      projectId,
      projectName: project.name,
      deletedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project status (for Kanban)
// @route   PUT /api/v1/projects/:id/status
// @access  Private
const updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const projectId = req.params.projectId;

    if (!Object.values(PROJECT_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
      });
    }

    // 1. Get project with essential fields
    let project = await Project.findById(projectId)
      .select("name status members owner")
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // 2. Check permission
    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString(),
    );

    if (!isMember && project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update project status",
      });
    }

    // 3. Check if status actually changed
    const oldStatus = project.status;
    if (oldStatus === status) {
      return res.status(200).json({
        success: true,
        data: project,
        message: "Status already set to this value",
      });
    }

    // 4. Update project status
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { status },
      { new: true, runValidators: true },
    ).lean();

    // 5. Fire and forget audit log
    AuditLog.create({
      projectId: project._id,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { status: { old: oldStatus, new: status } },
    }).catch((err) => console.error("Audit log failed:", err));

    // 6. Get all project members for notifications
    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner.toString());
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    // 7. Send notifications in background
    if (uniqueMemberIds.length > 0) {
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId: project._id,
        type: NOTIFICATION_TYPES.PROJECT_STATUS_CHANGED,
        title: "Project Status Updated",
        message: `${req.user.name} changed project status from ${oldStatus} to ${status}`,
        sender: req.user._id,
        data: {
          projectId: project._id,
          projectName: project.name,
          oldStatus: oldStatus,
          newStatus: status,
          updatedBy: req.user.name,
        },
        createdAt: new Date(),
      }));

      Notification.insertMany(notifications).catch((err) =>
        console.error("Failed to create notifications:", err),
      );

      // Send emails in background (limit to first 10)
      Promise.all(
        uniqueMemberIds.slice(0, 10).map(async (memberId) => {
          const member = await User.findById(memberId)
            .select("email name")
            .lean();
          if (member?.email) {
            sendNotificationEmail(
              member.email,
              member.name,
              `Project Status Updated: ${project.name}`,
              `${req.user.name} changed project status from ${oldStatus} to ${status}.`,
              `${process.env.FRONTEND_URL}/projects/${project._id}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        }),
      ).catch((err) => console.error("Email sending failed:", err));
    }

    // 8. Send real-time update (fire and forget)
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:status_changed", {
      projectId,
      status,
      updatedBy: req.user.name,
    });

    // 9. Send immediate response
    res.status(200).json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  updateProjectStatus,
};
