const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("./emailService");
const { NOTIFICATION_TYPES } = require("../utils/constants");

class NotificationService {
  // Send notification to single user
  static async sendToUser(userId, projectId, type, title, message, data = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      // Check user's notification preferences
      const preferences = user.notificationPreferences || {
        emailNotifications: true,
        inAppNotifications: true,
        types: {},
      };

      // Check if user wants this type of notification
      const shouldSendInApp =
        preferences.inAppNotifications && preferences.types[type] !== false;

      const shouldSendEmail =
        preferences.emailNotifications && preferences.types[type] !== false;

      let notification = null;

      // Create in-app notification
      if (shouldSendInApp) {
        notification = await Notification.create({
          userId,
          projectId,
          type,
          title,
          message,
          data,
        });

        // Send real-time via socket
        const io = require("../server").io;
        if (io) {
          io.to(`user:${userId}`).emit("notification:new", notification);
        }
      }

      // Send email notification
      if (shouldSendEmail) {
        const project = projectId
          ? await require("../models/Project").findById(projectId)
          : null;
        const projectName = project
          ? project.name
          : "Project Management System";

        await sendNotificationEmail(
          user.email,
          user.name,
          title,
          `${message}\n\nProject: ${projectName}`,
          data.link || `${process.env.FRONTEND_URL}/projects/${projectId}`,
        );
      }

      return notification;
    } catch (error) {
      console.error("Notification service error:", error);
      return null;
    }
  }

  // Send notification to multiple users
  static async sendToMany(userIds, projectId, type, title, message, data = {}) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.sendToUser(
        userId,
        projectId,
        type,
        title,
        message,
        data,
      );
      results.push(result);
    }
    return results;
  }

  // Send notification to all project members
  static async sendToProject(
    projectId,
    type,
    title,
    message,
    data = {},
    excludeUserIds = [],
  ) {
    try {
      const project = await require("../models/Project").findById(projectId);
      if (!project) return [];

      const memberIds = project.members.map((m) => m.user.toString());
      const ownerId = project.owner.toString();

      const allUserIds = [...new Set([...memberIds, ownerId])];
      const filteredUserIds = allUserIds.filter(
        (id) => !excludeUserIds.includes(id),
      );

      return await this.sendToMany(
        filteredUserIds,
        projectId,
        type,
        title,
        message,
        data,
      );
    } catch (error) {
      console.error("Send to project error:", error);
      return [];
    }
  }

  // Send notification on task assignment
  static async taskAssigned(task, assigneeId, assignedByName) {
    return await this.sendToUser(
      assigneeId,
      task.projectId,
      NOTIFICATION_TYPES.TASK_ASSIGNED,
      "New Task Assigned",
      `${assignedByName} assigned you to task: "${task.title}"`,
      {
        taskId: task._id,
        taskTitle: task.title,
        link: `${process.env.FRONTEND_URL}/projects/${task.projectId}/tasks/${task._id}`,
      },
    );
  }

  // Send notification on bug report
  static async bugReported(bug, projectId, reporterName) {
    const project = await require("../models/Project").findById(projectId);
    const adminMembers = project.members.filter(
      (m) => m.role === "Admin" || m.role === "Owner",
    );

    const adminIds = adminMembers.map((m) => m.user.toString());

    return await this.sendToMany(
      adminIds,
      projectId,
      NOTIFICATION_TYPES.BUG_REPORTED,
      "New Bug Reported",
      `${reporterName} reported bug #${bug.bugNumber}: "${bug.title}"`,
      {
        bugId: bug._id,
        bugNumber: bug.bugNumber,
        link: `${process.env.FRONTEND_URL}/projects/${projectId}/bugs/${bug._id}`,
      },
    );
  }

  // Send notification on @mention
  static async userMentioned(
    mentionedUserId,
    projectId,
    mentionedByName,
    context,
    contextId,
    contextType,
  ) {
    return await this.sendToUser(
      mentionedUserId,
      projectId,
      NOTIFICATION_TYPES.MENTION,
      "You were mentioned",
      `${mentionedByName} mentioned you in ${contextType}: "${context.substring(0, 100)}${context.length > 100 ? "..." : ""}"`,
      {
        contextType,
        contextId,
        link: `${process.env.FRONTEND_URL}/projects/${projectId}/${contextType}s/${contextId}`,
      },
    );
  }
}

module.exports = NotificationService;
