const Project = require("../models/Project");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const {
  USER_ROLES,
  AUDIT_ACTIONS,
  PROJECT_STATUS,
} = require("../utils/constants");
const { sendNotificationEmail } = require("../services/emailService");

// @desc    Get project settings
// @route   GET /api/v1/settings/:projectId
// @access  Private (Admin/Owner only)
const getSettings = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate("owner", "name email avatar role")
      .populate("members.user", "name email avatar role isOnline lastSeen");

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Update general settings
// @route   PUT /api/v1/settings/:projectId/general
// @access  Private (Admin/Owner only)
const updateGeneralSettings = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const changes = {};
    if (name && name !== project.name) {
      changes.name = { old: project.name, new: name };
      project.name = name;
    }
    if (description !== undefined && description !== project.description) {
      changes.description = { old: project.description, new: description };
      project.description = description;
    }
    if (status && status !== project.status) {
      changes.status = { old: project.status, new: status };
      project.status = status;
    }

    await project.save();

    const populatedProject = await Project.findById(projectId)
      .populate("owner", "name email avatar role")
      .populate("members.user", "name email avatar role isOnline lastSeen");

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "settings",
      entityId: project._id,
      entityName: "General Settings",
      changes,
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:updated", {
      type: "general",
      changes,
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "General settings updated successfully",
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sprint defaults
// @route   PUT /api/v1/settings/:projectId/sprint-defaults
// @access  Private (Admin/Owner only)
const updateSprintDefaults = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { defaultSprintDuration, defaultTaskEstimate, defaultPriority } =
      req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.settings) {
      project.settings = {};
    }

    const changes = {};
    if (
      defaultSprintDuration &&
      defaultSprintDuration !== project.settings.defaultSprintDuration
    ) {
      changes.defaultSprintDuration = {
        old: project.settings.defaultSprintDuration,
        new: defaultSprintDuration,
      };
      project.settings.defaultSprintDuration = defaultSprintDuration;
    }
    if (
      defaultTaskEstimate &&
      defaultTaskEstimate !== project.settings.defaultTaskEstimate
    ) {
      changes.defaultTaskEstimate = {
        old: project.settings.defaultTaskEstimate,
        new: defaultTaskEstimate,
      };
      project.settings.defaultTaskEstimate = defaultTaskEstimate;
    }
    if (
      defaultPriority &&
      defaultPriority !== project.settings.defaultPriority
    ) {
      changes.defaultPriority = {
        old: project.settings.defaultPriority,
        new: defaultPriority,
      };
      project.settings.defaultPriority = defaultPriority;
    }

    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "settings",
      entityId: project._id,
      entityName: "Sprint Defaults",
      changes,
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:updated", {
      type: "sprintDefaults",
      changes,
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Sprint defaults updated successfully",
      data: project.settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/settings/:projectId/notifications
// @access  Private (Admin/Owner only)
const updateNotificationSettings = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { emailOnTaskAssign, emailOnBugReport, emailOnSprintExpiry } =
      req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.settings) {
      project.settings = {};
    }
    if (!project.settings.notificationPreferences) {
      project.settings.notificationPreferences = {};
    }

    const changes = {};
    if (
      emailOnTaskAssign !== undefined &&
      emailOnTaskAssign !==
        project.settings.notificationPreferences.emailOnTaskAssign
    ) {
      changes.emailOnTaskAssign = {
        old: project.settings.notificationPreferences.emailOnTaskAssign,
        new: emailOnTaskAssign,
      };
      project.settings.notificationPreferences.emailOnTaskAssign =
        emailOnTaskAssign;
    }
    if (
      emailOnBugReport !== undefined &&
      emailOnBugReport !==
        project.settings.notificationPreferences.emailOnBugReport
    ) {
      changes.emailOnBugReport = {
        old: project.settings.notificationPreferences.emailOnBugReport,
        new: emailOnBugReport,
      };
      project.settings.notificationPreferences.emailOnBugReport =
        emailOnBugReport;
    }
    if (
      emailOnSprintExpiry !== undefined &&
      emailOnSprintExpiry !==
        project.settings.notificationPreferences.emailOnSprintExpiry
    ) {
      changes.emailOnSprintExpiry = {
        old: project.settings.notificationPreferences.emailOnSprintExpiry,
        new: emailOnSprintExpiry,
      };
      project.settings.notificationPreferences.emailOnSprintExpiry =
        emailOnSprintExpiry;
    }

    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "settings",
      entityId: project._id,
      entityName: "Notification Settings",
      changes,
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:updated", {
      type: "notifications",
      changes,
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      data: project.settings.notificationPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update integrations
// @route   PUT /api/v1/settings/:projectId/integrations
// @access  Private (Admin/Owner only)
const updateIntegrations = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { github, slackWebhook } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.settings) {
      project.settings = {};
    }
    if (!project.settings.integrations) {
      project.settings.integrations = {};
    }

    const changes = {};
    if (
      github !== undefined &&
      github !== project.settings.integrations.github
    ) {
      changes.github = {
        old: project.settings.integrations.github,
        new: github,
      };
      project.settings.integrations.github = github;
    }
    if (
      slackWebhook !== undefined &&
      slackWebhook !== project.settings.integrations.slackWebhook
    ) {
      changes.slackWebhook = {
        old: project.settings.integrations.slackWebhook,
        new: slackWebhook,
      };
      project.settings.integrations.slackWebhook = slackWebhook;
    }

    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "settings",
      entityId: project._id,
      entityName: "Integrations",
      changes,
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:updated", {
      type: "integrations",
      changes,
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Integrations updated successfully",
      data: project.settings.integrations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manage custom labels
// @route   POST /api/v1/settings/:projectId/labels
// @access  Private (Admin/Owner only)
const addCustomLabel = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({
        success: false,
        message: "Name and color are required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.settings) {
      project.settings = {};
    }
    if (!project.settings.customLabels) {
      project.settings.customLabels = [];
    }

    const newLabel = {
      id: Date.now().toString(),
      name,
      color,
      createdAt: new Date(),
    };

    project.settings.customLabels.push(newLabel);
    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "settings",
      entityId: project._id,
      entityName: "Custom Label",
      changes: { label: newLabel },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:labelAdded", {
      label: newLabel,
      addedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Label added successfully",
      data: newLabel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update custom label
// @route   PUT /api/v1/settings/:projectId/labels/:labelId
// @access  Private (Admin/Owner only)
const updateCustomLabel = async (req, res, next) => {
  try {
    const { projectId, labelId } = req.params;
    const { name, color } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const labelIndex = project.settings.customLabels.findIndex(
      (l) => l.id === labelId,
    );
    if (labelIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    const oldLabel = { ...project.settings.customLabels[labelIndex] };
    if (name) project.settings.customLabels[labelIndex].name = name;
    if (color) project.settings.customLabels[labelIndex].color = color;

    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "settings",
      entityId: project._id,
      entityName: "Custom Label",
      changes: {
        old: oldLabel,
        new: project.settings.customLabels[labelIndex],
      },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:labelUpdated", {
      labelId,
      label: project.settings.customLabels[labelIndex],
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Label updated successfully",
      data: project.settings.customLabels[labelIndex],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom label
// @route   DELETE /api/v1/settings/:projectId/labels/:labelId
// @access  Private (Admin/Owner only)
const deleteCustomLabel = async (req, res, next) => {
  try {
    const { projectId, labelId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const deletedLabel = project.settings.customLabels.find(
      (l) => l.id === labelId,
    );
    if (!deletedLabel) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    project.settings.customLabels = project.settings.customLabels.filter(
      (l) => l.id !== labelId,
    );
    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "settings",
      entityId: project._id,
      entityName: "Custom Label",
      changes: { deleted: deletedLabel },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("settings:labelDeleted", {
      labelId,
      deletedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Label deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all custom labels
// @route   GET /api/v1/settings/:projectId/labels
// @access  Private
const getCustomLabels = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).select(
      "settings.customLabels",
    );
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      data: project.settings?.customLabels || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive project
// @route   POST /api/v1/settings/:projectId/archive
// @access  Private (Admin/Owner only)
const archiveProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Project is already archived",
      });
    }

    project.isArchived = true;
    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.ARCHIVE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { isArchived: true },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:archived", {
      projectId,
      projectName: project.name,
      archivedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Project archived successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore archived project
// @route   POST /api/v1/settings/:projectId/restore
// @access  Private (Admin/Owner only)
const restoreArchivedProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.isArchived) {
      return res.status(400).json({
        success: false,
        message: "Project is not archived",
      });
    }

    project.isArchived = false;
    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.RESTORE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { isArchived: false },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:restored", {
      projectId,
      projectName: project.name,
      restoredBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Project restored successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete project (danger zone)
// @route   DELETE /api/v1/settings/:projectId/delete
// @access  Private (Owner only)
const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (
      project.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "Owner"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only project owner can delete the project",
      });
    }

    project.isDeleted = true;
    project.deletedAt = new Date();
    await project.save();

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { isDeleted: true, deletedAt: new Date() },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:deleted", {
      projectId,
      projectName: project.name,
      deletedBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer project ownership
// @route   POST /api/v1/settings/:projectId/transfer-ownership
// @access  Private (Owner only)
const transferOwnership = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only project owner can transfer ownership",
      });
    }

    const newOwner = await User.findById(userId);
    if (!newOwner) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMember = project.members.some((m) => m.user.toString() === userId);
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User must be a team member to become owner",
      });
    }

    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === userId,
    );
    if (memberIndex !== -1) {
      project.members.splice(memberIndex, 1);
    }

    project.members.push({
      user: project.owner,
      role: USER_ROLES.ADMIN,
      joinedAt: new Date(),
    });

    const currentOwner = await User.findById(project.owner);
    const currentOwnerProject = currentOwner.projects.find(
      (p) => p.projectId.toString() === projectId,
    );
    if (currentOwnerProject) {
      currentOwnerProject.role = USER_ROLES.ADMIN;
      await currentOwner.save();
    }

    project.owner = userId;
    await project.save();

    const newOwnerProject = newOwner.projects.find(
      (p) => p.projectId.toString() === projectId,
    );
    if (newOwnerProject) {
      newOwnerProject.role = USER_ROLES.OWNER;
      await newOwner.save();
    }

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "project",
      entityId: project._id,
      entityName: project.name,
      changes: { ownership: { old: req.user.name, new: newOwner.name } },
    });

    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("project:ownershipTransferred", {
      newOwnerId: userId,
      newOwnerName: newOwner.name,
      transferredBy: req.user.name,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `Ownership transferred to ${newOwner.name}`,
      data: {
        newOwner: {
          id: newOwner._id,
          name: newOwner.name,
          email: newOwner.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateGeneralSettings,
  updateSprintDefaults,
  updateNotificationSettings,
  updateIntegrations,
  addCustomLabel,
  updateCustomLabel,
  deleteCustomLabel,
  getCustomLabels,
  archiveProject,
  restoreArchivedProject,
  deleteProject,
  transferOwnership,
};
