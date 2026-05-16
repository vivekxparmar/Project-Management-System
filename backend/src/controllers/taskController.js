const Task = require("../models/Task");
const Subtask = require("../models/Subtask");
const Sprint = require("../models/Sprint");
const Project = require("../models/Project");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  TASK_STATUS,
  PRIORITIES,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require("../utils/constants");
const {
  calculateTaskStatus,
  calculateTaskEstimate,
  calculateTaskTrackedTime,
} = require("../utils/helpers");
const { sendNotificationEmail } = require("../services/emailService");

// @desc    Create a new task
// @route   POST /api/v1/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      priority,
      assignees,
      sprintId,
      projectId,
      isInBacklog,
    } = req.body;
    const io = req.app.get("io");

    // 1. Create task - single DB operation
    const task = await Task.create({
      title,
      description: description || "",
      priority: priority || PRIORITIES.P3,
      projectId,
      sprintId: isInBacklog ? null : sprintId,
      isInBacklog: isInBacklog || false,
      creator: req.user._id,
      assignees: assignees || [],
      status: TASK_STATUS.TODO,
    });

    // 2. Prepare parallel operations
    const parallelOperations = [];

    // Update sprint if needed
    if (sprintId && !isInBacklog) {
      parallelOperations.push(
        Sprint.findByIdAndUpdate(sprintId, { $push: { tasks: task._id } })
          .lean()
          .catch((err) => console.error("Sprint update failed:", err)),
      );
    }

    // Create audit log (fire and forget)
    AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      changes: { title, priority, assignees, sprintId, isInBacklog },
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

    // 4. Send notifications in background (don't await)
    if (uniqueMemberIds.length > 0) {
      const taskLocation = isInBacklog ? "backlog" : `sprint ${sprintId || ""}`;
      const assigneeNames =
        assignees?.length > 0
          ? ` Assigned to: ${assignees.length} member(s).`
          : "";

      // Batch create notifications
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId,
        type: NOTIFICATION_TYPES.TASK_CREATED,
        title: "New Task Created",
        message: `${req.user.name} created task "${task.title}" in ${taskLocation}${assigneeNames}`,
        sender: req.user._id,
        data: {
          taskId: task._id,
          taskTitle: task.title,
          priority: priority || PRIORITIES.P3,
          sprintId: sprintId || null,
          isInBacklog: isInBacklog || false,
          assignees: assignees || [],
          createdBy: req.user.name,
        },
        createdAt: new Date(),
      }));

      // Insert notifications in background
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

      // Send emails in background (limit to first 10 to avoid overload)
      Promise.all(
        uniqueMemberIds.slice(0, 10).map(async (memberId) => {
          const member = await User.findById(memberId)
            .select("email name")
            .lean();
          if (member?.email) {
            sendNotificationEmail(
              member.email,
              member.name,
              `New Task: "${task.title}"`,
              `${req.user.name} created a new task "${task.title}" in ${taskLocation}.${assigneeNames}`,
              `${process.env.FRONTEND_URL}/projects/${projectId}/tasks/${task._id}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        }),
      ).catch((err) => console.error("Email sending failed:", err));
    }

    // 5. Wait for sprint update if needed (with timeout)
    if (parallelOperations.length > 0) {
      await Promise.race([
        Promise.all(parallelOperations),
        new Promise((resolve) => setTimeout(resolve, 1000)), // 1 second timeout
      ]);
    }

    // 6. Populate task for response (optimized)
    const populatedTask = await Task.findById(task._id)
      .populate("creator", "name email avatar")
      .populate("assignees", "name email avatar")
      .lean();

    // 7. Send real-time update (fire and forget)
    io.to(`project:${projectId}`).emit("task:created", {
      success: true,
      entity: "task",
      action: "created",
      projectId,
      performedBy: {
        _id: req.user._id,
        name: req.user.name,
      },
      data: {
        task: populatedTask,
        sprintId: populatedTask.sprintId,
        isInBacklog: populatedTask.isInBacklog,
      },
      timestamp: new Date(),
    });

    // 8. Send immediate response
    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks by sprint
// @route   GET /api/v1/tasks/sprint/:sprintId
// @access  Private
const getTasksBySprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;

    const tasks = await Task.find({ sprintId })
      .populate("creator", "name email avatar")
      .populate("assignees", "name email avatar") // Changed from assignee to assignees
      .populate({
        path: "subtasks",
        populate: [
          {
            path: "creator",
            select: "name email avatar",
          },
          {
            path: "assignee",
            select: "name email avatar",
          },
        ],
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, assignees, status } = req.body;
    const taskId = req.params.id;
    const io = req.app.get("io");

    // 1. Get task with essential fields
    let task = await Task.findById(taskId)
      .select(
        "title description priority assignees status sprintId projectId creator",
      )
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // 2. Quick sprint lock check
    if (task.sprintId) {
      const sprint = await Sprint.findById(task.sprintId)
        .select("isLocked")
        .lean();
      if (sprint?.isLocked) {
        return res.status(400).json({
          success: false,
          message: "Cannot update task in a locked sprint",
        });
      }
    }

    // 3. Track changes
    const changes = {};
    const oldAssignees = task.assignees?.map((a) => a.toString()) || [];
    const newAssignees = assignees
      ? assignees.map((a) => a.toString())
      : oldAssignees;

    if (title !== undefined && title !== task.title)
      changes.title = { old: task.title, new: title };
    if (description !== undefined && description !== task.description)
      changes.description = { old: task.description, new: description };
    if (priority !== undefined && priority !== task.priority)
      changes.priority = { old: task.priority, new: priority };
    if (
      assignees !== undefined &&
      JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)
    )
      changes.assignees = { old: oldAssignees, new: newAssignees };
    if (status !== undefined && status !== task.status)
      changes.status = { old: task.status, new: status };

    // 4. Update task if there are changes
    let updatedTask = task;
    if (Object.keys(changes).length > 0) {
      const updateData = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(assignees !== undefined && { assignees }),
        ...(status !== undefined && { status }),
      };

      updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("creator assignees", "name email avatar")
        .lean();
    } else {
      // If no changes, just populate
      updatedTask = await Task.findById(taskId)
        .populate("creator assignees", "name email avatar")
        .lean();
    }

    // 5. Fire and forget audit log
    if (Object.keys(changes).length > 0) {
      AuditLog.create({
        projectId: task.projectId,
        user: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "task",
        entityId: task._id,
        entityName: updatedTask.title || task.title,
        changes,
      }).catch((err) => console.error("Audit log failed:", err));
    }

    // 6. Send notifications in background if there are changes
    if (Object.keys(changes).length > 0) {
      // Get project members efficiently
      const project = await Project.findById(task.projectId)
        .select("members owner")
        .lean();

      const memberIds = project.members
        .map((m) => m.user.toString())
        .filter((id) => id !== req.user._id.toString());

      if (project.owner.toString() !== req.user._id.toString()) {
        memberIds.push(project.owner.toString());
      }

      const uniqueMemberIds = [...new Set(memberIds)];

      if (uniqueMemberIds.length > 0) {
        // Create change summary
        const changeSummary = Object.keys(changes)
          .map((key) => {
            if (key === "title") return `title to "${changes.title.new}"`;
            if (key === "description") return "description";
            if (key === "priority")
              return `priority to ${changes.priority.new}`;
            if (key === "status") return `status to ${changes.status.new}`;
            if (key === "assignees") {
              const added = changes.assignees.new.filter(
                (id) => !changes.assignees.old.includes(id),
              );
              const removed = changes.assignees.old.filter(
                (id) => !changes.assignees.new.includes(id),
              );
              if (added.length && removed.length)
                return `assignees: +${added.length}, -${removed.length}`;
              if (added.length) return `assignees: +${added.length} added`;
              if (removed.length)
                return `assignees: -${removed.length} removed`;
              return "assignees changed";
            }
            return key;
          })
          .join(", ");

        // Batch create notifications
        const notifications = uniqueMemberIds.map((memberId) => ({
          userId: memberId,
          projectId: task.projectId,
          type: NOTIFICATION_TYPES.TASK_UPDATED,
          title: "Task Updated",
          message: `${req.user.name} updated task "${updatedTask.title || task.title}": ${changeSummary}`,
          sender: req.user._id,
          data: {
            taskId: task._id,
            taskTitle: updatedTask.title || task.title,
            changes: changes,
            updatedBy: req.user.name,
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
          .catch((err) =>
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
                `Task Updated: "${updatedTask.title || task.title}"`,
                `${req.user.name} updated task "${updatedTask.title || task.title}": ${changeSummary}`,
                `${process.env.FRONTEND_URL}/projects/${task.projectId}/tasks/${task._id}`,
              ).catch((err) => console.error("Email failed:", err));
            }
          }),
        ).catch((err) => console.error("Email sending failed:", err));
      }

      // 7. Special notifications for assignee changes (background)
      if (changes.assignees) {
        const addedAssignees = changes.assignees.new.filter(
          (id) =>
            !changes.assignees.old.includes(id) &&
            id.toString() !== req.user._id.toString(),
        );

        for (const assigneeId of addedAssignees) {
          Notification.create({
            userId: assigneeId,
            projectId: task.projectId,
            type: NOTIFICATION_TYPES.TASK_ASSIGNED,
            title: "Task Assigned to You",
            message: `You have been assigned to task "${updatedTask.title || task.title}"`,
            sender: req.user._id,
            data: {
              taskId: task._id,
              taskTitle: updatedTask.title || task.title,
              assignedBy: req.user.name,
            },
          }).catch((err) =>
            console.error("Assignee notification failed:", err),
          );

          // Send email to assignee
          User.findById(assigneeId)
            .select("email name")
            .lean()
            .then((assigneeUser) => {
              if (assigneeUser?.email) {
                sendNotificationEmail(
                  assigneeUser.email,
                  assigneeUser.name,
                  `Task Assigned: "${updatedTask.title || task.title}"`,
                  `${req.user.name} assigned you to task "${updatedTask.title || task.title}".`,
                  `${process.env.FRONTEND_URL}/projects/${task.projectId}/tasks/${task._id}`,
                ).catch((err) => console.error("Email failed:", err));
              }
            })
            .catch((err) => console.error("Failed to get assignee:", err));
        }

        // Notify removed assignees
        const removedAssignees = changes.assignees.old.filter(
          (id) =>
            !changes.assignees.new.includes(id) &&
            id.toString() !== req.user._id.toString(),
        );

        for (const assigneeId of removedAssignees) {
          Notification.create({
            userId: assigneeId,
            projectId: task.projectId,
            type: NOTIFICATION_TYPES.TASK_UNASSIGNED,
            title: "Task Unassigned",
            message: `You have been unassigned from task "${updatedTask.title || task.title}"`,
            sender: req.user._id,
            data: {
              taskId: task._id,
              taskTitle: updatedTask.title || task.title,
              unassignedBy: req.user.name,
            },
          }).catch((err) =>
            console.error("Unassign notification failed:", err),
          );

          // Send email to removed assignee
          User.findById(assigneeId)
            .select("email name")
            .lean()
            .then((assigneeUser) => {
              if (assigneeUser?.email) {
                sendNotificationEmail(
                  assigneeUser.email,
                  assigneeUser.name,
                  `Task Unassigned: "${updatedTask.title || task.title}"`,
                  `${req.user.name} unassigned you from task "${updatedTask.title || task.title}".`,
                  `${process.env.FRONTEND_URL}/projects/${task.projectId}/tasks/${task._id}`,
                ).catch((err) => console.error("Email failed:", err));
              }
            })
            .catch((err) => console.error("Failed to get assignee:", err));
        }
      }
    }

    // 8. Send real-time update (fire and forget)
    io.to(`project:${task.projectId}`).emit("task:updated", {
      task: updatedTask,
      changes,
      updatedBy: req.user.name,
    });

    // 9. Send immediate response
    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh task assignees from subtasks
// @route   POST /api/v1/tasks/:id/refresh-assignees
// @access  Private
const refreshTaskAssignees = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await task.refreshAssignees();

    const updatedTask = await Task.findById(taskId).populate(
      "creator assignees",
      "name email avatar",
    );

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const io = req.app.get("io");

    // 1. Get task with essential fields only
    const task = await Task.findById(taskId)
      .select("title assignees sprintId projectId")
      .lean();

    const projectId =
      req.body.projectId || req.query.projectId || task?.projectId;

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // 2. Quick sprint lock check
    if (task.sprintId) {
      const sprint = await Sprint.findById(task.sprintId)
        .select("isLocked")
        .lean();
      if (sprint?.isLocked) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete task from a locked sprint",
        });
      }
    }

    // 3. Store details for notifications
    const taskTitle = task.title;
    const taskAssignees = task.assignees || [];
    const taskSprintId = task.sprintId;
    const taskProjectId = task.projectId;

    // 4. Get subtask count quickly
    const subtaskCount = await Subtask.countDocuments({ taskId: task._id });

    // 5. Fire and forget - Delete all subtasks in background
    Subtask.deleteMany({ taskId: task._id }).catch((err) =>
      console.error("Failed to delete subtasks:", err),
    );

    // 6. Fire and forget - Remove task from sprint
    if (task.sprintId) {
      Sprint.findByIdAndUpdate(task.sprintId, {
        $pull: { tasks: task._id },
      })
        .lean()
        .catch((err) =>
          console.error("Failed to remove task from sprint:", err),
        );
    }

    // 7. Fire and forget - Create audit log
    AuditLog.create({
      projectId: task.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      changes: { deleted: true, subtaskCount },
    }).catch((err) => console.error("Audit log failed:", err));

    // 8. Get project members efficiently
    const project = await Project.findById(taskProjectId)
      .select("members owner")
      .lean();

    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner.toString());
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    // 9. Send notifications in background
    if (uniqueMemberIds.length > 0) {
      const taskLocation = taskSprintId ? "sprint" : "backlog";
      const subtaskMessage =
        subtaskCount > 0
          ? ` (including ${subtaskCount} subtask${subtaskCount > 1 ? "s" : ""})`
          : "";

      // Batch notifications for all members
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId: taskProjectId,
        type: NOTIFICATION_TYPES.TASK_DELETED,
        title: "Task Deleted",
        message: `${req.user.name} deleted task "${taskTitle}" from ${taskLocation}${subtaskMessage}`,
        sender: req.user._id,
        data: {
          taskId: task._id,
          taskTitle: taskTitle,
          taskLocation: taskLocation,
          subtaskCount: subtaskCount,
          assignees: taskAssignees,
          deletedBy: req.user.name,
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
              `Task Deleted: "${taskTitle}"`,
              `${req.user.name} deleted task "${taskTitle}" from ${taskLocation}${subtaskMessage}.`,
              `${process.env.FRONTEND_URL}/projects/${taskProjectId}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        }),
      ).catch((err) => console.error("Email sending failed:", err));
    }

    // 10. Special notifications for assignees (background)
    for (const assigneeId of taskAssignees) {
      if (assigneeId.toString() !== req.user._id.toString()) {
        Notification.create({
          userId: assigneeId,
          projectId: taskProjectId,
          type: NOTIFICATION_TYPES.TASK_UNASSIGNED,
          title: "Task Deleted - You Were Assigned",
          message: `Task "${taskTitle}" that you were assigned to has been deleted by ${req.user.name}`,
          sender: req.user._id,
          data: {
            taskId: task._id,
            taskTitle: taskTitle,
            deletedBy: req.user.name,
          },
        }).catch((err) => console.error("Assignee notification failed:", err));

        // Send email to assignee
        User.findById(assigneeId)
          .select("email name")
          .lean()
          .then((assigneeUser) => {
            if (assigneeUser?.email) {
              sendNotificationEmail(
                assigneeUser.email,
                assigneeUser.name,
                `Task Deleted: "${taskTitle}"`,
                `The task "${taskTitle}" that you were assigned to has been deleted by ${req.user.name}.`,
                `${process.env.FRONTEND_URL}/projects/${taskProjectId}`,
              ).catch((err) => console.error("Email failed:", err));
            }
          })
          .catch((err) => console.error("Failed to get assignee:", err));
      }
    }

    // 11. Delete the actual task (this is the only blocking operation)
    await Task.findByIdAndDelete(taskId);

    // 12. Send real-time update (fire and forget)

    io.to(`project:${task.projectId}`).emit("task:deleted", {
      taskId,
      sprintId: taskSprintId,
      taskTitle: task.title,
      subtaskCount,
      deletedBy: req.user.name,
    });

    // 13. Send immediate response
    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const moveTaskToSprint = async (req, res, next) => {
  try {
    const { sprintId } = req.body;
    const taskId = req.params.id;
    const io = req.app.get("io");

    // 1. Get task and sprint in parallel
    const [task, sprint] = await Promise.all([
      Task.findById(taskId)
        .select("title projectId sprintId isInBacklog assignees")
        .lean(),
      Sprint.findById(sprintId).select("name isLocked").lean(),
    ]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint not found",
      });
    }

    if (sprint.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot move task to a locked sprint",
      });
    }

    const oldSprintId = task.sprintId;
    const oldIsInBacklog = task.isInBacklog;
    const taskTitle = task.title;
    const taskAssignees = task.assignees || [];

    // 2. Get old sprint name if exists (parallel)
    let oldSprintName = null;
    if (oldSprintId) {
      const oldSprint = await Sprint.findById(oldSprintId)
        .select("name")
        .lean();
      oldSprintName = oldSprint?.name;
    }

    // 3. Prepare all database operations
    const updateOperations = [];

    // Remove from old sprint
    if (oldSprintId) {
      updateOperations.push(
        Sprint.findByIdAndUpdate(oldSprintId, {
          $pull: { tasks: task._id },
        }).lean(),
      );
    }

    // Add to new sprint
    updateOperations.push(
      Sprint.findByIdAndUpdate(sprintId, {
        $push: { tasks: task._id },
      }).lean(),
    );

    // Update task
    updateOperations.push(
      Task.findByIdAndUpdate(
        taskId,
        {
          sprintId: sprintId,
          isInBacklog: false,
        },
        { new: true },
      ),
    );

    // Execute all updates in parallel
    const [updatedTask] = await Promise.all(updateOperations);

    // 4. Fire and forget audit log
    AuditLog.create({
      projectId: task.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.MOVE,
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      changes: {
        sprint: { old: oldSprintId, new: sprintId },
        backlog: { old: oldIsInBacklog, new: false },
      },
    }).catch((err) => console.error("Audit log failed:", err));

    // 5. Get project members efficiently
    const project = await Project.findById(task.projectId)
      .select("members owner")
      .lean();

    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner.toString());
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    // 6. Send notifications in background
    if (uniqueMemberIds.length > 0) {
      // Create movement description
      let movementDescription = "";
      if (oldIsInBacklog) {
        movementDescription = `moved from backlog to sprint "${sprint.name}"`;
      } else if (oldSprintId) {
        movementDescription = `moved from sprint "${oldSprintName}" to sprint "${sprint.name}"`;
      } else {
        movementDescription = `added to sprint "${sprint.name}"`;
      }

      // Batch notifications for all members
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId: task.projectId,
        type: NOTIFICATION_TYPES.TASK_MOVED,
        title: "Task Moved",
        message: `${req.user.name} ${movementDescription}: "${taskTitle}"`,
        sender: req.user._id,
        data: {
          taskId: task._id,
          taskTitle: taskTitle,
          fromSprintId: oldSprintId,
          fromSprintName: oldSprintName,
          fromBacklog: oldIsInBacklog,
          toSprintId: sprintId,
          toSprintName: sprint.name,
          movedBy: req.user.name,
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
              `Task Moved: "${taskTitle}"`,
              `${req.user.name} ${movementDescription}.`,
              `${process.env.FRONTEND_URL}/projects/${task.projectId}/sprints/${sprintId}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        }),
      ).catch((err) => console.error("Email sending failed:", err));
    }

    // 7. Special notifications for assignees (background)
    if (taskAssignees.length > 0) {
      for (const assigneeId of taskAssignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          const movementDesc = oldIsInBacklog
            ? `moved from backlog to sprint "${sprint.name}"`
            : `moved to sprint "${sprint.name}"`;

          Notification.create({
            userId: assigneeId,
            projectId: task.projectId,
            type: NOTIFICATION_TYPES.TASK_UPDATED,
            title: "Your Task Has Been Moved",
            message: `Task "${taskTitle}" that you're assigned to has been ${movementDesc}`,
            sender: req.user._id,
            data: {
              taskId: task._id,
              taskTitle: taskTitle,
              toSprintId: sprintId,
              toSprintName: sprint.name,
              movedBy: req.user.name,
            },
          }).catch((err) =>
            console.error("Assignee notification failed:", err),
          );

          // Send email to assignee
          User.findById(assigneeId)
            .select("email name")
            .lean()
            .then((assigneeUser) => {
              if (assigneeUser?.email) {
                sendNotificationEmail(
                  assigneeUser.email,
                  assigneeUser.name,
                  `Task Moved: "${taskTitle}"`,
                  `Task "${taskTitle}" that you're assigned to has been ${movementDesc} by ${req.user.name}.`,
                  `${process.env.FRONTEND_URL}/projects/${task.projectId}/sprints/${sprintId}`,
                ).catch((err) => console.error("Email failed:", err));
              }
            })
            .catch((err) => console.error("Failed to get assignee:", err));
        }
      }
    }

    // 8. Get final populated task for response (if needed)
    const finalTask = await Task.findById(taskId)
      .populate("creator", "_id name email avatar")
      .populate("assignees", "_id name email avatar")
      .populate({
        path: "subtasks",
        populate: [
          { path: "creator", select: "_id name email avatar" },
          { path: "assignee", select: "_id name email avatar" },
        ],
      })
      .lean();

    // 9. Send real-time update (fire and forget)
    io.to(`project:${task.projectId}`).emit("task:moved", {
      task: finalTask,

      fromBacklog: oldIsInBacklog,
      fromSprintId: oldSprintId,

      toSprintId: sprintId,

      taskTitle,
      movedBy: req.user.name,
    });

    // 10. Send immediate response
    res.status(200).json({
      success: true,
      message: `Task moved to sprint "${sprint.name}" successfully`,
      data: finalTask,
    });
  } catch (error) {
    next(error);
  }
};

const moveTaskToBacklog = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const io = req.app.get("io");

    // 1. Get task with essential fields
    const task = await Task.findById(taskId)
      .select("title projectId sprintId isInBacklog assignees")
      .lean();

    const projectId =
      req.body.projectId || req.query.projectId || task?.projectId;

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // 2. Quick sprint lock check
    if (task.sprintId) {
      const sprint = await Sprint.findById(task.sprintId)
        .select("isLocked")
        .lean();
      if (sprint?.isLocked) {
        return res.status(400).json({
          success: false,
          message: "Cannot move task from a locked sprint",
        });
      }
    }

    const oldSprintId = task.sprintId;
    const taskTitle = task.title;
    const taskAssignees = task.assignees || [];

    // 3. Get old sprint name if exists
    let oldSprintName = null;
    if (oldSprintId) {
      const oldSprint = await Sprint.findById(oldSprintId)
        .select("name")
        .lean();
      oldSprintName = oldSprint?.name;
    }

    // 4. Prepare all database operations in parallel
    const updateOperations = [];

    // Remove from sprint
    if (oldSprintId) {
      updateOperations.push(
        Sprint.findByIdAndUpdate(oldSprintId, {
          $pull: { tasks: task._id },
        }).lean(),
      );
    }

    // Update task
    updateOperations.push(
      Task.findByIdAndUpdate(
        taskId,
        {
          sprintId: null,
          isInBacklog: true,
        },
        { new: true },
      ),
    );

    // Execute all updates in parallel
    const [updatedTask] = await Promise.all(updateOperations);

    // 5. Fire and forget audit log
    AuditLog.create({
      projectId: task.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.MOVE,
      entityType: "task",
      entityId: task._id,
      entityName: task.title,
      changes: {
        sprint: { old: oldSprintId, new: null },
        backlog: { old: false, new: true },
      },
    }).catch((err) => console.error("Audit log failed:", err));

    // 6. Get project members efficiently
    const project = await Project.findById(task.projectId)
      .select("members owner")
      .lean();

    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner.toString());
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    // 7. Send notifications in background
    if (uniqueMemberIds.length > 0) {
      // Create movement description
      const movementDescription = oldSprintId
        ? `moved from sprint "${oldSprintName}" to backlog`
        : `moved to backlog`;

      // Batch notifications for all members
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId: task.projectId,
        type: NOTIFICATION_TYPES.TASK_MOVED_TO_BACKLOG,
        title: "Task Moved to Backlog",
        message: `${req.user.name} ${movementDescription}: "${taskTitle}"`,
        sender: req.user._id,
        data: {
          taskId: task._id,
          taskTitle: taskTitle,
          fromSprintId: oldSprintId,
          fromSprintName: oldSprintName,
          movedBy: req.user.name,
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
              `Task Moved to Backlog: "${taskTitle}"`,
              `${req.user.name} ${movementDescription}.`,
              `${process.env.FRONTEND_URL}/projects/${task.projectId}/backlog`,
            ).catch((err) => console.error("Email failed:", err));
          }
        }),
      ).catch((err) => console.error("Email sending failed:", err));
    }

    // 8. Special notifications for assignees (background)
    if (taskAssignees.length > 0) {
      const movementDesc = oldSprintId
        ? `moved from sprint "${oldSprintName}" to backlog`
        : `moved to backlog`;

      for (const assigneeId of taskAssignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          Notification.create({
            userId: assigneeId,
            projectId: task.projectId,
            type: NOTIFICATION_TYPES.TASK_UPDATED,
            title: "Your Task Has Been Moved to Backlog",
            message: `Task "${taskTitle}" that you're assigned to has been ${movementDesc}`,
            sender: req.user._id,
            data: {
              taskId: task._id,
              taskTitle: taskTitle,
              movedBy: req.user.name,
            },
          }).catch((err) =>
            console.error("Assignee notification failed:", err),
          );

          // Send email to assignee
          User.findById(assigneeId)
            .select("email name")
            .lean()
            .then((assigneeUser) => {
              if (assigneeUser?.email) {
                sendNotificationEmail(
                  assigneeUser.email,
                  assigneeUser.name,
                  `Task Moved to Backlog: "${taskTitle}"`,
                  `Task "${taskTitle}" that you're assigned to has been ${movementDesc} by ${req.user.name}.`,
                  `${process.env.FRONTEND_URL}/projects/${task.projectId}/backlog`,
                ).catch((err) => console.error("Email failed:", err));
              }
            })
            .catch((err) => console.error("Failed to get assignee:", err));
        }
      }
    }

    // 9. Get final populated task for response
    const finalTask =
      updatedTask ||
      (await Task.findById(taskId)
        .populate("creator assignees", "name email avatar")
        .lean());

    // 10. Send real-time update (fire and forget)

    io.to(`project:${task.projectId}`).emit("task:movedToBacklog", {
      taskId,
      fromSprintId: oldSprintId,
      oldSprintName,
      taskTitle: taskTitle,
      movedBy: req.user.name,
    });

    // 11. Send immediate response
    res.status(200).json({
      success: true,
      message: "Task moved to backlog successfully",
      data: finalTask,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTasksBySprint,
  updateTask,
  deleteTask,
  moveTaskToSprint,
  moveTaskToBacklog,
  refreshTaskAssignees,
};
