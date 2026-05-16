const { hasPermission } = require("../utils/helpers");
const { USER_ROLES } = require("../utils/constants");
const Project = require("../models/Project");

// Generic permission checker
const checkPermission = (action) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!hasPermission(userRole, action)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to perform this action. Required: ${action}, Your role: ${userRole}`,
      });
    }

    next();
  };
};

// Project-specific permission checker
const checkProjectPermission = (action) => {
  return async (req, res, next) => {
    try {
      const projectId =
        req.params?.projectId || req.body?.projectId || req.query?.projectId;

      const userId = req.user._id;
      const userRole = req.user.role;

      // Check if user is Owner - has all permissions
      if (userRole === USER_ROLES.OWNER) {
        return next();
      }

      // Get user's role in this specific project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found(From RBAC Middleware)",
        });
      }

      const member = project.members.find(
        (m) => m.user.toString() === userId.toString(),
      );
      if (!member && project.owner.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this project",
        });
      }

      const projectRole =
        member?.role ||
        (project.owner.toString() === userId.toString()
          ? USER_ROLES.OWNER
          : null);

      // Check permission for the project role
      if (!hasPermission(projectRole, action)) {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to ${action} in this project`,
        });
      }

      // Attach project role to req for later use
      req.projectRole = projectRole;
      req.project = project;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Check if user is project owner or admin
const isProjectOwnerOrAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === USER_ROLES.OWNER) {
      return next();
    }

    const project = await require("../models/Project").findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const isOwner = project.owner.toString() === userId.toString();
    const member = project.members.find(
      (m) => m.user.toString() === userId.toString(),
    );
    const isAdmin = member && member.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only project owner or admin can perform this action",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is project owner
const isProjectOwner = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    const userId = req.user._id;

    const project = await require("../models/Project").findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (
      project.owner.toString() !== userId.toString() &&
      req.user.role !== USER_ROLES.OWNER
    ) {
      return res.status(403).json({
        success: false,
        message: "Only project owner can perform this action",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkPermission,
  checkProjectPermission,
  isProjectOwnerOrAdmin,
  isProjectOwner,
};
