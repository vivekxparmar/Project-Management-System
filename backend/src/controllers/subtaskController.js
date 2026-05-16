const Subtask = require("../models/Subtask");
const Task = require("../models/Task");
const Sprint = require("../models/Sprint");
const Project = require("../models/Project");
const TimerSession = require("../models/TimerSession");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("../services/emailService");
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

// Helper function to refresh task assignees from its subtasks
const refreshTaskAssignees = async (taskId) => {
  const task = await Task.findById(taskId).populate("subtasks");
  if (!task) return null;

  // Collect unique assignees from all subtasks
  const assigneeSet = new Set();
  for (const subtask of task.subtasks) {
    if (subtask.assignee) {
      assigneeSet.add(subtask.assignee.toString());
    }
  }

  // Update task's assignees array
  task.assignees = Array.from(assigneeSet);
  await task.save();

  return task;
};

// @desc    Create a new subtask
// @route   POST /api/v1/subtasks
// @access  Private
const createSubtask = async (req, res, next) => {
  try {
    const { title, priority, estimate, assigneeId, taskId, projectId } =
      req.body;
    const io = req.app.get("io");

    // 1. Create subtask
    const subtask = await Subtask.create({
      title,
      priority: priority || PRIORITIES.P3,
      estimate: estimate || 1,
      taskId,
      projectId,
      creator: req.user._id,
      assignee: assigneeId || null,
      status: TASK_STATUS.TODO,
    });

    // 2. Update parent task in parallel
    const task = await Task.findById(taskId);
    task.subtasks.push(subtask._id);

    // Calculate updates
    const allSubtasks = await Subtask.find({ taskId }).select(
      "status estimate trackedTime",
    );
    task.status = calculateTaskStatus(allSubtasks);
    task.estimate = calculateTaskEstimate(allSubtasks);

    await task.save();

    // 3. Refresh assignees in background
    refreshTaskAssignees(taskId).catch((err) =>
      console.error("Failed to refresh assignees:", err),
    );

    // 4. Create audit log (fire and forget)
    AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "subtask",
      entityId: subtask._id,
      entityName: subtask.title,
      changes: { title, priority, estimate, assignee: assigneeId },
    }).catch((err) => console.error("Audit log failed:", err));

    // 5. Send notifications in background
    const project = await Project.findById(projectId).select("members owner");

    const memberIds = project.members
      .map((m) => m.user.toString())
      .filter((id) => id !== req.user._id.toString());

    if (project.owner.toString() !== req.user._id.toString()) {
      memberIds.push(project.owner.toString());
    }

    const uniqueMemberIds = [...new Set(memberIds)];

    if (uniqueMemberIds.length > 0) {
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId,
        type: NOTIFICATION_TYPES.SUBTASK_CREATED,
        title: "New Subtask Created",
        message: `${req.user.name} created subtask "${title}" under task "${task.title}"`,
        sender: req.user._id,
        data: {
          subtaskId: subtask._id,
          subtaskTitle: title,
          taskId: taskId,
          taskTitle: task.title,
          assigneeId: assigneeId || null,
          createdBy: req.user.name,
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

    // Special notification for assignee
    if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
      Notification.create({
        userId: assigneeId,
        projectId,
        type: NOTIFICATION_TYPES.SUBTASK_ASSIGNED,
        title: "Subtask Assigned to You",
        message: `You have been assigned to subtask "${title}" under task "${task.title}"`,
        sender: req.user._id,
        data: {
          subtaskId: subtask._id,
          subtaskTitle: title,
          taskId: taskId,
          taskTitle: task.title,
          assignedBy: req.user.name,
        },
      }).catch((err) => console.error("Assignee notification failed:", err));
    }

    // 6. Return response quickly
    const populatedSubtask = await Subtask.findById(subtask._id)
      .populate("creator assignee", "name email avatar")
      .lean();

    const updatedTask = await Task.findById(taskId)
      .populate("creator assignees", "name email avatar")
      .lean();

    // 7. Send real-time update
    io.to(`project:${projectId}`).emit("subtask:created", {
      subtask: populatedSubtask,
      taskId,
      sprintId: task.sprintId,
      updatedTaskStatus: task.status,
      updatedTaskEstimate: task.estimate,
      updatedTaskAssignees: updatedTask.assignees,
      createdBy: req.user.name,
    });

    res.status(201).json({
      success: true,
      data: populatedSubtask,
      taskUpdate: {
        status: task.status,
        estimate: task.estimate,
        trackedTime: task.trackedTime,
        assignees: updatedTask.assignees,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSubtask = async (req, res, next) => {
  try {
    const { title, priority, estimate, assigneeId, status } = req.body;
    const subtaskId = req.params.id;
    const io = req.app.get("io");

    // 1. Get subtask and check existence quickly
    let subtask = await Subtask.findById(subtaskId).lean();
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // 2. Quick sprint lock check (parallel)
    const task = await Task.findById(subtask.taskId).select(
      "sprintId title projectId",
    );
    if (task.sprintId) {
      const sprint = await Sprint.findById(task.sprintId).select("isLocked");
      if (sprint?.isLocked) {
        return res.status(400).json({
          success: false,
          message: "Cannot update subtask in a locked sprint",
        });
      }
    }

    // 3. Track changes
    const changes = {};
    const oldAssigneeId = subtask.assignee?.toString();
    const newAssigneeId = assigneeId;

    if (title !== undefined && title !== subtask.title)
      changes.title = { old: subtask.title, new: title };
    if (priority !== undefined && priority !== subtask.priority)
      changes.priority = { old: subtask.priority, new: priority };
    if (estimate !== undefined && estimate !== subtask.estimate)
      changes.estimate = { old: subtask.estimate, new: estimate };
    if (assigneeId !== undefined && assigneeId !== oldAssigneeId)
      changes.assignee = { old: oldAssigneeId, new: newAssigneeId };

    // 4. Prepare update data
    const updateData = {
      ...(title !== undefined && { title }),
      ...(priority !== undefined && { priority }),
      ...(estimate !== undefined && { estimate }),
      ...(assigneeId !== undefined && { assignee: assigneeId }),
      ...(status !== undefined && { status }),
    };

    // 5. Handle timer operations
    let timerPromise = null;
    let activeTimerStart = null;
    let trackedTime = subtask.trackedTime;

    if (status && status !== subtask.status) {
      changes.status = { old: subtask.status, new: status };
      const oldStatus = subtask.status;
      const newStatus = status;

      // Timer operations - handle asynchronously
      if (newStatus === "In Progress" && oldStatus !== "In Progress") {
        timerPromise = TimerSession.create({
          subtaskId: subtask._id,
          userId: req.user._id,
          startTime: new Date(),
          isActive: true,
        })
          .then((timer) => {
            updateData.activeTimerStart = timer.startTime;
            return timer;
          })
          .catch((err) => console.error("Timer creation failed:", err));
      } else if (
        (oldStatus === "In Progress" &&
          (newStatus === "Todo" || newStatus === "Done")) ||
        (oldStatus === "In Progress" && newStatus === "Done")
      ) {
        timerPromise = (async () => {
          const activeTimer = await TimerSession.findOne({
            subtaskId: subtask._id,
            isActive: true,
          });

          if (activeTimer) {
            activeTimer.endTime = new Date();
            activeTimer.isActive = false;
            activeTimer.duration = Math.floor(
              (activeTimer.endTime - activeTimer.startTime) / 1000,
            );
            await activeTimer.save();

            const sessions = await TimerSession.find({
              subtaskId: subtask._id,
            });
            const totalTrackedTime = sessions.reduce(
              (sum, s) => sum + (s.duration || 0),
              0,
            );
            trackedTime = totalTrackedTime;
            updateData.trackedTime = totalTrackedTime;
          }
          updateData.activeTimerStart = null;
          return null;
        })();
      } else if (
        oldStatus === "Done" &&
        newStatus !== "Done" &&
        newStatus === "In Progress"
      ) {
        timerPromise = TimerSession.create({
          subtaskId: subtask._id,
          userId: req.user._id,
          startTime: new Date(),
          isActive: true,
        })
          .then((timer) => {
            updateData.activeTimerStart = timer.startTime;
            return timer;
          })
          .catch((err) => console.error("Timer creation failed:", err));
      }
    }

    // 6. Update subtask
    if (timerPromise) {
      await timerPromise;
    }

    subtask = await Subtask.findByIdAndUpdate(subtaskId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("creator assignee", "name email avatar")
      .lean();

    // 7. Update parent task in background
    const updateParentTask = async () => {
      try {
        const allSubtasks = await Subtask.find({ taskId: subtask.taskId })
          .select("status estimate trackedTime")
          .lean();

        task.status = calculateTaskStatus(allSubtasks);
        task.estimate = calculateTaskEstimate(allSubtasks);
        task.trackedTime = calculateTaskTrackedTime(allSubtasks);

        await refreshTaskAssignees(subtask.taskId);
        await task.save();

        return task;
      } catch (err) {
        console.error("Failed to update parent task:", err);
        return null;
      }
    };

    // Fire and forget parent task update
    const parentTaskPromise = updateParentTask();

    // 8. Create audit log (fire and forget)
    if (Object.keys(changes).length > 0) {
      AuditLog.create({
        projectId: subtask.projectId,
        user: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "subtask",
        entityId: subtask._id,
        entityName: subtask.title,
        changes,
      }).catch((err) => console.error("Audit log failed:", err));
    }

    // 9. Send notifications in background
    if (Object.keys(changes).length > 0) {
      const project = await Project.findById(subtask.projectId)
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
            if (key === "priority")
              return `priority to ${changes.priority.new}`;
            if (key === "estimate")
              return `estimate to ${changes.estimate.new}h`;
            if (key === "status") return `status to ${changes.status.new}`;
            if (key === "assignee") {
              return changes.assignee.new
                ? `assigned to a new person`
                : `unassigned`;
            }
            return key;
          })
          .join(", ");

        // Batch insert notifications
        const notifications = uniqueMemberIds.map((memberId) => ({
          userId: memberId,
          projectId: subtask.projectId,
          type: NOTIFICATION_TYPES.SUBTASK_UPDATED,
          title: "Subtask Updated",
          message: `${req.user.name} updated subtask "${subtask.title}" under task "${task.title}": ${changeSummary}`,
          sender: req.user._id,
          data: {
            subtaskId: subtask._id,
            subtaskTitle: subtask.title,
            taskId: task._id,
            taskTitle: task.title,
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

        // Send emails in background (batch)
        Promise.all(
          uniqueMemberIds.slice(0, 10).map(async (memberId) => {
            // Limit to 10 emails
            const member = await User.findById(memberId)
              .select("email name")
              .lean();
            if (member?.email) {
              sendNotificationEmail(
                member.email,
                member.name,
                `Subtask Updated: "${subtask.title}"`,
                `${req.user.name} updated subtask "${subtask.title}" under task "${task.title}": ${changeSummary}`,
                `${process.env.FRONTEND_URL}/projects/${subtask.projectId}/tasks/${task._id}`,
              ).catch((err) => console.error("Email failed:", err));
            }
          }),
        ).catch((err) => console.error("Email sending failed:", err));
      }
    }

    // 10. Special notifications for assignee changes (fire and forget)
    if (
      assigneeId !== undefined &&
      changes.assignee &&
      newAssigneeId &&
      newAssigneeId.toString() !== req.user._id.toString()
    ) {
      Notification.create({
        userId: newAssigneeId,
        projectId: subtask.projectId,
        type: NOTIFICATION_TYPES.SUBTASK_ASSIGNED,
        title: "Subtask Assigned to You",
        message: `You have been assigned to subtask "${subtask.title}" under task "${task.title}"`,
        sender: req.user._id,
        data: {
          subtaskId: subtask._id,
          subtaskTitle: subtask.title,
          taskId: task._id,
          taskTitle: task.title,
          assignedBy: req.user.name,
        },
      }).catch((err) => console.error("Assignee notification failed:", err));

      // Send email to assignee
      User.findById(newAssigneeId)
        .select("email name")
        .lean()
        .then((assigneeUser) => {
          if (assigneeUser?.email) {
            sendNotificationEmail(
              assigneeUser.email,
              assigneeUser.name,
              "Subtask Assigned",
              `${req.user.name} assigned you to subtask "${subtask.title}" under task "${task.title}".`,
              `${process.env.FRONTEND_URL}/projects/${subtask.projectId}/tasks/${task._id}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        })
        .catch((err) => console.error("Failed to get assignee:", err));
    }

    // Notify old assignee if unassigned
    if (
      assigneeId !== undefined &&
      changes.assignee &&
      oldAssigneeId &&
      !newAssigneeId &&
      oldAssigneeId.toString() !== req.user._id.toString()
    ) {
      Notification.create({
        userId: oldAssigneeId,
        projectId: subtask.projectId,
        type: NOTIFICATION_TYPES.SUBTASK_UNASSIGNED,
        title: "Subtask Unassigned",
        message: `You have been unassigned from subtask "${subtask.title}" under task "${task.title}"`,
        sender: req.user._id,
        data: {
          subtaskId: subtask._id,
          subtaskTitle: subtask.title,
          taskId: task._id,
          taskTitle: task.title,
          unassignedBy: req.user.name,
        },
      }).catch((err) => console.error("Unassign notification failed:", err));
    }

    // 11. Wait for parent task update (but with timeout)
    const updatedParentTask = await Promise.race([
      parentTaskPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 2000)), // 2 second timeout
    ]);

    // 12. Get updated task for response (use cached if available)
    let updatedTask = null;
    if (updatedParentTask) {
      updatedTask = await Task.findById(subtask.taskId)
        .populate("creator assignees", "name email avatar")
        .lean();
    } else {
      // Fallback: get fresh data
      updatedTask = await Task.findById(subtask.taskId)
        .populate("creator assignees", "name email avatar")
        .lean();
    }

    // 13. Send real-time update
    io.to(`project:${subtask.projectId}`).emit("subtask:updated", {
      subtask,
      taskId: subtask.taskId,
      sprintId: task.sprintId,
      updatedTaskStatus: updatedParentTask?.status || task.status,
      updatedTaskEstimate: updatedParentTask?.estimate || task.estimate,
      updatedTaskTrackedTime:
        updatedParentTask?.trackedTime || task.trackedTime,
      updatedTaskAssignees: updatedTask?.assignees || [],
      updatedBy: req.user.name,
    });

    // 14. Send immediate response
    res.status(200).json({
      success: true,
      data: subtask,
      taskUpdate: {
        status: updatedParentTask?.status || task.status,
        estimate: updatedParentTask?.estimate || task.estimate,
        trackedTime: updatedParentTask?.trackedTime || task.trackedTime,
        assignees: updatedTask?.assignees || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subtask
// @route   DELETE /api/v1/subtasks/:id
// @access  Private
const deleteSubtask = async (req, res, next) => {
  try {
    const subtaskId = req.params.id;
    const io = req.app.get("io");

    // 1. Get subtask with essential fields only
    const subtask = await Subtask.findById(subtaskId)
      .select("title assignee taskId projectId")
      .lean();

    const projectId =
      req.body.projectId || req.query.projectId || subtask?.projectId;

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // 2. Check sprint lock (optimized with selective fields)
    const task = await Task.findById(subtask.taskId)
      .select("sprintId title projectId subtasks")
      .lean();

    if (task.sprintId) {
      const sprint = await Sprint.findById(task.sprintId)
        .select("isLocked")
        .lean();
      if (sprint?.isLocked) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete subtask from a locked sprint",
        });
      }
    }

    // 3. Store details for notifications
    const subtaskTitle = subtask.title;
    const subtaskAssignee = subtask.assignee;
    const parentTaskTitle = task.title;
    const parentTaskId = task._id;

    // 4. Delete timer sessions in background (fire and forget)
    TimerSession.deleteMany({ subtaskId }).catch((err) =>
      console.error("Failed to delete timer sessions:", err),
    );

    // 5. Update parent task asynchronously
    const updateParentTask = async () => {
      try {
        // Remove subtask from task's subtasks array
        const updatedSubtasks = task.subtasks.filter(
          (id) => id.toString() !== subtaskId,
        );

        // Get remaining subtasks
        const remainingSubtasks = await Subtask.find({ taskId: subtask.taskId })
          .select("status estimate trackedTime")
          .lean();

        // Calculate new values
        const newStatus = calculateTaskStatus(remainingSubtasks);
        const newEstimate = calculateTaskEstimate(remainingSubtasks);
        const newTrackedTime = calculateTaskTrackedTime(remainingSubtasks);

        // Update task
        await Task.findByIdAndUpdate(subtask.taskId, {
          $set: {
            subtasks: updatedSubtasks,
            status: newStatus,
            estimate: newEstimate,
            trackedTime: newTrackedTime,
          },
        });

        // Refresh assignees in background
        await refreshTaskAssignees(subtask.taskId);

        return {
          status: newStatus,
          estimate: newEstimate,
          trackedTime: newTrackedTime,
        };
      } catch (err) {
        console.error("Failed to update parent task:", err);
        return null;
      }
    };

    // Fire and forget parent task update
    const parentTaskUpdatePromise = updateParentTask();

    // 6. Create audit log (fire and forget)
    AuditLog.create({
      projectId: subtask.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "subtask",
      entityId: subtask._id,
      entityName: subtask.title,
      changes: { deleted: true },
    }).catch((err) => console.error("Audit log failed:", err));

    // 7. Get project members for notifications
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

    // 8. Send notifications in background
    if (uniqueMemberIds.length > 0) {
      // Batch notifications for all members
      const notifications = uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        projectId: subtask.projectId,
        type: NOTIFICATION_TYPES.SUBTASK_DELETED,
        title: "Subtask Deleted",
        message: `${req.user.name} deleted subtask "${subtaskTitle}" from task "${parentTaskTitle}"`,
        sender: req.user._id,
        data: {
          subtaskId: subtask._id,
          subtaskTitle: subtaskTitle,
          taskId: parentTaskId,
          taskTitle: parentTaskTitle,
          assignee: subtaskAssignee,
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
              `Subtask Deleted: "${subtaskTitle}"`,
              `${req.user.name} deleted subtask "${subtaskTitle}" from task "${parentTaskTitle}".`,
              `${process.env.FRONTEND_URL}/projects/${projectId}/tasks/${parentTaskId}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        }),
      ).catch((err) => console.error("Email sending failed:", err));
    }

    // 9. Special notification for assignee (fire and forget)
    if (
      subtaskAssignee &&
      subtaskAssignee.toString() !== req.user._id.toString()
    ) {
      Notification.create({
        userId: subtaskAssignee,
        projectId: subtask.projectId,
        type: NOTIFICATION_TYPES.SUBTASK_DELETED,
        title: "Your Subtask Has Been Deleted",
        message: `Subtask "${subtaskTitle}" that you were assigned to has been deleted from task "${parentTaskTitle}" by ${req.user.name}`,
        sender: req.user._id,
        data: {
          subtaskId: subtask._id,
          subtaskTitle: subtaskTitle,
          taskId: parentTaskId,
          taskTitle: parentTaskTitle,
          deletedBy: req.user.name,
        },
      }).catch((err) => console.error("Assignee notification failed:", err));

      // Send email to assignee
      User.findById(subtaskAssignee)
        .select("email name")
        .lean()
        .then((assigneeUser) => {
          if (assigneeUser?.email) {
            sendNotificationEmail(
              assigneeUser.email,
              assigneeUser.name,
              `Subtask Deleted: "${subtaskTitle}"`,
              `The subtask "${subtaskTitle}" that you were assigned to has been deleted from task "${parentTaskTitle}" by ${req.user.name}.`,
              `${process.env.FRONTEND_URL}/projects/${projectId}/tasks/${parentTaskId}`,
            ).catch((err) => console.error("Email failed:", err));
          }
        })
        .catch((err) => console.error("Failed to get assignee:", err));
    }

    // 10. Delete subtask from database
    await Subtask.findByIdAndDelete(subtaskId);

    // 11. Wait for parent task update with timeout
    const parentTaskUpdate = await Promise.race([
      parentTaskUpdatePromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);

    // 12. Get updated task for response (with timeout)
    let updatedTask = null;
    try {
      updatedTask = await Promise.race([
        Task.findById(subtask.taskId)
          .populate("creator assignees", "name email avatar")
          .lean(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 1500),
        ),
      ]);
    } catch (err) {
      console.error("Failed to fetch updated task:", err);
      updatedTask = null;
    }

    // 13. Send real-time update (fire and forget)
    io.to(`project:${subtask.projectId}`).emit("subtask:deleted", {
      subtaskId,
      taskId: subtask.taskId,
      sprintId: task.sprintId,
      subtaskTitle: subtaskTitle,
      updatedTaskStatus: parentTaskUpdate?.status || task.status,
      updatedTaskEstimate: parentTaskUpdate?.estimate || task.estimate,
      updatedTaskTrackedTime: parentTaskUpdate?.trackedTime || 0,
      updatedTaskAssignees: updatedTask?.assignees || [],
      deletedBy: req.user.name,
    });

    // 14. Send immediate response
    res.status(200).json({
      success: true,
      message: "Subtask deleted successfully",
      taskUpdate: {
        status: parentTaskUpdate?.status || task.status,
        estimate: parentTaskUpdate?.estimate || task.estimate,
        trackedTime: parentTaskUpdate?.trackedTime || 0,
        assignees: updatedTask?.assignees || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
