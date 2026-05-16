const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const Subtask = require("../models/Subtask");
const Project = require("../models/Project");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const TimerSession = require("../models/TimerSession");
const {
  SPRINT_STATUS,
  TASK_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require("../utils/constants");
const {
  calculateTaskStatus,
  calculateTaskEstimate,
  calculateTaskTrackedTime,
} = require("../utils/helpers");
const { sendNotificationEmail } = require("../services/emailService");

// @desc    Create a new sprint
// @route   POST /api/v1/sprints
// @access  Private
const createSprint = async (req, res, next) => {
  try {
    const { name, startDate, endDate, goal, projectId } = req.body;

    // Check if there's already an active sprint
    const existingActiveSprint = await Sprint.findOne({
      projectId,
      status: SPRINT_STATUS.ACTIVE,
    });

    let status = SPRINT_STATUS.PLANNED;
    if (existingActiveSprint) {
      status = SPRINT_STATUS.PLANNED;
    }

    const sprint = await Sprint.create({
      name,
      projectId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goal: goal || "",
      status,
      createdBy: req.user._id,
    });

    // Create audit log
    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "sprint",
      entityId: sprint._id,
      entityName: sprint.name,
      changes: { name, startDate, endDate, goal },
    });

    // Get all project members for notification
    const project = await Project.findById(projectId);

    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    // Create notifications
    const notifications = memberIds.map((memberId) => ({
      userId: memberId,
      projectId,
      type: "sprint_created",
      title: "New Sprint Created",
      message: `Sprint "${sprint.name}" has been created`,
      sender: req.user._id,
      data: { sprintId: sprint._id, sprintName: sprint.name },
    }));
    const io = req.app.get("io");
    await Notification.insertMany(notifications)
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

    // Send real-time notification
    io.to(`project:${projectId}`).emit("sprint:created", {
      sprint,
      createdBy: req.user.name,
    });

    res.status(201).json({
      success: true,
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sprints for a project
// @route   GET /api/v1/sprints/project/:projectId
// @access  Private
const getSprintsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const sprints = await Sprint.find({ projectId })
      .sort({ createdAt: 1 })
      .populate("createdBy", "name email avatar")
      .populate({
        path: "tasks",
        populate: [
          {
            path: "subtasks",
            model: "Subtask",
            populate: {
              path: "assignee creator",
              select: "name email avatar",
            },
          },
          {
            path: "assignees",
            select: "name email avatar",
          },
          {
            path: "creator",
            select: "name email avatar",
          },
        ],
      });

    res.status(200).json({
      success: true,
      count: sprints.length,
      data: sprints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sprint
// @route   GET /api/v1/sprints/:id
// @access  Private
const getSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate("createdBy", "name email avatar")
      .populate({
        path: "tasks",
        populate: [
          {
            path: "subtasks",
            populate: { path: "assignee creator", select: "name email avatar" },
          },
          { path: "assignees", select: "name email avatar" },
          { path: "creator", select: "name email avatar" },
        ],
      });

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sprint
// @route   PUT /api/v1/sprints/:id
// @access  Private
const updateSprint = async (req, res, next) => {
  try {
    const { name, startDate, endDate, goal } = req.body;
    const sprintId = req.params.id;
    const io = req.app.get("io");

    let sprint = await Sprint.findById(sprintId);
    const projectId = req.body.projectId || sprint?.projectId;
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    // Don't allow editing if sprint is locked or completed
    if (sprint.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a locked sprint",
      });
    }

    if (sprint.status === SPRINT_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a completed sprint",
      });
    }

    const changes = {};
    if (name && name !== sprint.name)
      changes.name = { old: sprint.name, new: name };
    if (startDate && new Date(startDate) !== sprint.startDate)
      changes.startDate = { old: sprint.startDate, new: startDate };
    if (endDate && new Date(endDate) !== sprint.endDate)
      changes.endDate = { old: sprint.endDate, new: endDate };
    if (goal && goal !== sprint.goal)
      changes.goal = { old: sprint.goal, new: goal };

    sprint = await Sprint.findByIdAndUpdate(
      sprintId,
      { name, startDate, endDate, goal },
      { new: true, runValidators: true },
    );

    // Create audit log
    await AuditLog.create({
      projectId: sprint.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "sprint",
      entityId: sprint._id,
      entityName: sprint.name,
      changes,
    });

    // Send notifications to all project members except the updater
    if (Object.keys(changes).length > 0) {
      const project = await Project.findById(sprint.projectId);

      const memberIds = project.members
        .map((m) => m.user)
        .filter((memberId) => memberId.toString() !== req.user._id.toString());

      // Also include the owner if they're not already in members and not the updater
      if (project.owner.toString() !== req.user._id.toString()) {
        memberIds.push(project.owner);
      }

      // Remove duplicates
      const uniqueMemberIds = [
        ...new Set(memberIds.map((id) => id.toString())),
      ];

      if (uniqueMemberIds.length > 0) {
        // Create a readable summary of changes
        const changeSummary = Object.keys(changes)
          .map((key) => {
            if (key === "name") return `name to "${changes.name.new}"`;
            if (key === "startDate")
              return `start date to ${new Date(changes.startDate.new).toLocaleDateString()}`;
            if (key === "endDate")
              return `end date to ${new Date(changes.endDate.new).toLocaleDateString()}`;
            if (key === "goal") return "goal";
            return key;
          })
          .join(", ");

        await Notification.insertMany(
          uniqueMemberIds.map((memberId) => ({
            userId: memberId,
            projectId: sprint.projectId,
            type: "sprint_updated",
            title: "Sprint Updated",
            message: `${req.user.name} updated sprint "${sprint.name}": ${changeSummary}`,
            sender: req.user._id,
            data: {
              sprintId: sprint._id,
              sprintName: sprint.name,
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
          .catch((err) =>
            console.error("Failed to create notifications:", err),
          );
      }
    }

    // Send real-time update
    io.to(`project:${sprint.projectId}`).emit("sprint:updated", {
      sprint,
      updatedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete sprint
// @route   DELETE /api/v1/sprints/:id
// @access  Private
const deleteSprint = async (req, res, next) => {
  try {
    const sprintId = req.params.id;
    const sprint = await Sprint.findById(sprintId);
    const projectId = req.body.projectId || sprint?.projectId;
    const io = req.app.get("io");

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    // Don't allow deletion if sprint is active or locked
    if (sprint.status === SPRINT_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete an active sprint. Complete or cancel it first.",
      });
    }

    if (sprint.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a locked sprint",
      });
    }

    // Move all tasks to backlog and clear assignees
    const tasks = await Task.find({ sprintId }).select("_id");
    const tasksCount = tasks.length;
    await Task.updateMany(
      { sprintId },
      {
        sprintId: null,
        isInBacklog: true,
        assignees: [], // Clear assignees when moving to backlog
      },
    );

    // Create audit log
    await AuditLog.create({
      projectId: sprint.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "sprint",
      entityId: sprint._id,
      entityName: sprint.name,
      changes: { deleted: true },
    });

    // Send notifications to all project members except the deleter
    const project = await Project.findById(sprint.projectId);

    const memberIds = project.members
      .map((m) => m.user)
      .filter((memberId) => memberId.toString() !== req.user._id.toString());

    // Also include the owner if they're not already in members and not the deleter
    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner);
    }

    // Remove duplicates
    const uniqueMemberIds = [...new Set(memberIds.map((id) => id.toString()))];

    if (uniqueMemberIds.length > 0) {
      await Notification.insertMany(
        uniqueMemberIds.map((memberId) => ({
          userId: memberId,
          projectId: sprint.projectId,
          type: "sprint_deleted",
          title: "Sprint Deleted",
          message: `${req.user.name} deleted sprint "${sprint.name}"${tasksCount > 0 ? `. ${tasksCount} task(s) moved to backlog.` : ""}`,
          sender: req.user._id,
          data: {
            sprintId: sprint._id,
            sprintName: sprint.name,
            tasksMovedToBacklog: tasksCount,
            deletedBy: req.user.name,
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

    await sprint.deleteOne();

    // Send real-time update

    io.to(`project:${sprint.projectId}`).emit("sprint:deleted", {
      sprintId,
      deletedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Sprint deleted successfully. Tasks moved to backlog.",
    });
  } catch (error) {
    next(error);
  }
};

const changeSprintStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const sprintId = req.params.id;
    const io = req.app.get("io");

    if (!Object.values(SPRINT_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sprint status",
      });
    }

    let sprint = await Sprint.findById(sprintId);
    const projectId = req.body.projectId || sprint?.projectId;
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    const oldStatus = sprint.status;

    // Validation rules
    if (oldStatus === SPRINT_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of a completed sprint",
      });
    }

    if (status === SPRINT_STATUS.ACTIVE) {
      // Check if another sprint is already active
      const activeSprint = await Sprint.findOne({
        projectId: sprint.projectId,
        status: SPRINT_STATUS.ACTIVE,
        _id: { $ne: sprintId },
      });

      if (activeSprint) {
        return res.status(400).json({
          success: false,
          message: "Another sprint is already active. Complete it first.",
        });
      }
    }

    sprint.status = status;
    let incompleteTasks = [];

    if (status === SPRINT_STATUS.COMPLETED) {
      sprint.completedAt = new Date();

      // Move incomplete tasks to backlog
      incompleteTasks = await Task.find({
        sprintId,
        status: { $ne: TASK_STATUS.DONE },
      });

      await Task.updateMany(
        { _id: { $in: incompleteTasks.map((t) => t._id) } },
        {
          sprintId: null,
          isInBacklog: true,
          assignees: [],
        },
      );
    }

    await sprint.save();

    // Create audit log
    await AuditLog.create({
      projectId: sprint.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entityType: "sprint",
      entityId: sprint._id,
      entityName: sprint.name,
      changes: { status: { old: oldStatus, new: status } },
    });

    // Send notifications to all project members except the updater
    const project = await Project.findById(sprint.projectId);

    const memberIds = project.members
      .map((m) => m.user)
      .filter((memberId) => memberId.toString() !== req.user._id.toString());

    // Also include the owner if they're not already in members and not the updater
    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner);
    }

    // Remove duplicates
    const uniqueMemberIds = [...new Set(memberIds.map((id) => id.toString()))];

    if (uniqueMemberIds.length > 0) {
      let notificationType,
        title,
        message,
        additionalData = {};

      // Determine notification type and message based on status change
      switch (status) {
        case SPRINT_STATUS.ACTIVE:
          notificationType = NOTIFICATION_TYPES.SPRINT_STARTED;
          title = "Sprint Started";
          message = `${req.user.name} started sprint "${sprint.name}"`;
          break;
        case SPRINT_STATUS.COMPLETED:
          notificationType = NOTIFICATION_TYPES.SPRINT_COMPLETED;
          title = "Sprint Completed";
          message = `${req.user.name} completed sprint "${sprint.name}"`;
          if (incompleteTasks.length > 0) {
            message += `. ${incompleteTasks.length} incomplete task(s) moved to backlog.`;
            additionalData.movedTasksCount = incompleteTasks.length;
          }
          break;
        case SPRINT_STATUS.PLANNING:
          notificationType = NOTIFICATION_TYPES.SPRINT_PLANNING;
          title = "Sprint Status Changed";
          message = `${req.user.name} moved sprint "${sprint.name}" to planning`;
          break;
        default:
          notificationType = NOTIFICATION_TYPES.SPRINT_UPDATED;
          title = "Sprint Status Changed";
          message = `${req.user.name} changed sprint "${sprint.name}" status from ${oldStatus} to ${status}`;
      }

      await Notification.insertMany(
        uniqueMemberIds.map((memberId) => ({
          userId: memberId,
          projectId: sprint.projectId,
          type: notificationType,
          title: title,
          message: message,
          sender: req.user._id,
          data: {
            sprintId: sprint._id,
            sprintName: sprint.name,
            oldStatus: oldStatus,
            newStatus: status,
            updatedBy: req.user.name,
            ...additionalData,
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

    // Send real-time update
    io.to(`project:${sprint.projectId}`).emit("sprint:statusChanged", {
      sprintId,
      oldStatus,
      newStatus: status,
      movedTasksCount:
        status === SPRINT_STATUS.COMPLETED ? incompleteTasks?.length || 0 : 0,
      updatedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      data: sprint,
      movedTasksCount:
        status === SPRINT_STATUS.COMPLETED ? incompleteTasks?.length || 0 : 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lock/Unlock sprint
// @route   PUT /api/v1/sprints/:id/lock
// @access  Private (Owner/Admin only)
const toggleSprintLock = async (req, res, next) => {
  try {
    const { lock } = req.body; // true = lock, false = unlock
    const sprintId = req.params.id;
    const io = req.app.get("io");

    let sprint = await Sprint.findById(sprintId);
    const projectId = req.body.projectId || sprint?.projectId;
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    if (sprint.status === SPRINT_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: "Cannot lock/unlock a completed sprint",
      });
    }

    sprint.isLocked = lock;
    await sprint.save();

    // Create audit log
    await AuditLog.create({
      projectId: sprint.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: lock ? AUDIT_ACTIONS.LOCK : AUDIT_ACTIONS.UNLOCK,
      entityType: "sprint",
      entityId: sprint._id,
      entityName: sprint.name,
      changes: { isLocked: lock },
    });

    // Send notifications to all project members except the deleter
    const project = await Project.findById(sprint.projectId);

    const memberIds = project.members
      .map((m) => m.user)
      .filter((memberId) => memberId.toString() !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner);
    }

    // Remove duplicates
    const uniqueMemberIds = [...new Set(memberIds.map((id) => id.toString()))];

    if (uniqueMemberIds.length > 0) {
      await Notification.insertMany(
        uniqueMemberIds.map((memberId) => ({
          userId: memberId,
          projectId: sprint.projectId,
          type: "sprint_locked",
          title: `${lock ? "Sprint Locked" : "Sprint Unlocked"}`,
          message: `${req.user.name} ${lock ? "locked" : "unlocked"} sprint "${sprint.name}"`,
          sender: req.user._id,
          data: {
            sprintId: sprint._id,
            sprintName: sprint.name,
            isLocked: lock,
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

    // Send real-time update
    io.to(`project:${sprint.projectId}`).emit("sprint:lockToggled", {
      sprintId,
      isLocked: lock,
      updatedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: `Sprint ${lock ? "locked" : "unlocked"} successfully`,
      data: sprint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSprint,
  getSprintsByProject,
  getSprint,
  updateSprint,
  deleteSprint,
  changeSprintStatus,
  toggleSprintLock,
};
