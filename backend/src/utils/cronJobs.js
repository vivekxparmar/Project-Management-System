// const cron = require("node-cron");

// // This is yet to be implemented for sprint expiry
// const setupCronJobs = () => {
//   // Run every day at midnight
//   cron.schedule("0 0 * * *", async () => {
//     console.log("Running scheduled tasks...");
//   });
// };

// module.exports = { setupCronJobs };

const cron = require("node-cron");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const { sendNotificationEmail } = require("../services/emailService");
const {
  SPRINT_STATUS,
  NOTIFICATION_TYPES,
  AUDIT_ACTIONS,
} = require("./constants");

// Get populated member list for a project

const getProjectMembers = async (projectId) => {
  const project = await Project.findById(projectId).populate(
    "members.user",
    "name email",
  );
  if (!project) return [];

  const seen = new Set();
  const members = [];

  for (const m of project.members) {
    if (m.user && !seen.has(m.user._id.toString())) {
      seen.add(m.user._id.toString());
      members.push(m.user);
    }
  }

  return members;
};

// Auto-complete overdue ACTIVE sprints (midnight)

const handleOverdueSprints = async (io) => {
  console.log("[CRON] Checking for overdue active sprints...");

  const now = new Date();

  const overdueSprints = await Sprint.find({
    status: SPRINT_STATUS.ACTIVE,
    endDate: { $lt: now },
  });

  if (overdueSprints.length === 0) {
    console.log("[CRON] No overdue sprints found.");
    return;
  }

  console.log(
    `[CRON] Found ${overdueSprints.length} overdue sprint(s). Processing...`,
  );

  for (const sprint of overdueSprints) {
    try {
      // 1. Find incomplete tasks
      const incompleteTasks = await Task.find({
        sprintId: sprint._id,
        status: { $ne: "Done" },
      });

      // 2. Move incomplete tasks to backlog
      if (incompleteTasks.length > 0) {
        await Task.updateMany(
          { _id: { $in: incompleteTasks.map((t) => t._id) } },
          { sprintId: null, isInBacklog: true, assignees: [] },
        );
      }

      // 3. Mark sprint as Completed
      sprint.status = SPRINT_STATUS.COMPLETED;
      sprint.completedAt = now;
      sprint.isLocked = false;
      await sprint.save();

      // 4. Audit log (system action)
      await AuditLog.create({
        projectId: sprint.projectId,
        user: null,
        userName: "System",
        userRole: "system",
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: "sprint",
        entityId: sprint._id,
        entityName: sprint.name,
        changes: {
          status: { old: SPRINT_STATUS.ACTIVE, new: SPRINT_STATUS.COMPLETED },
          reason: "Auto-completed by system: sprint end date passed",
          incompleteTasks: incompleteTasks.length,
        },
      });

      // 5. Get members
      const members = await getProjectMembers(sprint.projectId);

      if (members.length > 0) {
        const message =
          incompleteTasks.length > 0
            ? `Sprint "${sprint.name}" has expired and was automatically completed. ${incompleteTasks.length} incomplete task(s) were moved to the backlog.`
            : `Sprint "${sprint.name}" has expired and was automatically completed.`;

        // 6. In-app notifications
        await Notification.insertMany(
          members.map((member) => ({
            userId: member._id,
            projectId: sprint.projectId,
            type: NOTIFICATION_TYPES.SPRINT_EXPIRED,
            title: "Sprint Expired",
            message,
            sender: null,
            data: {
              sprintId: sprint._id,
              sprintName: sprint.name,
              incompleteTasks: incompleteTasks.length,
              autoCompleted: true,
            },
          })),
        );

        // 7. Emails
        for (const member of members) {
          await sendNotificationEmail(
            member.email,
            member.name,
            `Sprint Expired: ${sprint.name}`,
            message,
            `${process.env.FRONTEND_URL}/projects/portal/${sprint.projectId}/sprint`,
          );
        }
      }

      // 8. Real-time socket events
      if (io) {
        io.to(`project:${sprint.projectId}`).emit("sprint:expired", {
          sprintId: sprint._id,
          sprintName: sprint.name,
          incompleteTasks: incompleteTasks.length,
          autoCompleted: true,
        });

        io.to(`project:${sprint.projectId}`).emit("sprint:statusChanged", {
          sprintId: sprint._id,
          oldStatus: SPRINT_STATUS.ACTIVE,
          newStatus: SPRINT_STATUS.COMPLETED,
          movedTasksCount: incompleteTasks.length,
          updatedBy: "System",
        });
      }

      console.log(
        `[CRON] Sprint "${sprint.name}" auto-completed. ` +
          `${incompleteTasks.length} task(s) moved to backlog.`,
      );
    } catch (err) {
      console.error(
        `[CRON] Error processing sprint ${sprint._id}:`,
        err.message,
      );
    }
  }
};

// Warn members 1 day before sprint ends (9 AM)

const handleSprintExpiryWarnings = async (io) => {
  console.log("[CRON] Checking for sprints ending tomorrow...");

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const expiringSoon = await Sprint.find({
    status: SPRINT_STATUS.ACTIVE,
    endDate: { $gte: in24h, $lt: in48h },
  });

  if (expiringSoon.length === 0) {
    console.log("[CRON] No sprints ending tomorrow.");
    return;
  }

  console.log(`[CRON] Found ${expiringSoon.length} sprint(s) ending tomorrow.`);

  for (const sprint of expiringSoon) {
    try {
      const members = await getProjectMembers(sprint.projectId);

      const incompleteCount = await Task.countDocuments({
        sprintId: sprint._id,
        status: { $ne: "Done" },
      });

      const message =
        `Sprint "${sprint.name}" ends tomorrow. ` +
        (incompleteCount > 0
          ? `There are still ${incompleteCount} incomplete task(s). Please wrap up or they will be moved to the backlog.`
          : `All tasks are completed — great work!`);

      if (members.length > 0) {
        // In-app notifications
        await Notification.insertMany(
          members.map((member) => ({
            userId: member._id,
            projectId: sprint.projectId,
            type: NOTIFICATION_TYPES.SPRINT_EXPIRED,
            title: "Sprint Ending Tomorrow",
            message,
            sender: null,
            data: {
              sprintId: sprint._id,
              sprintName: sprint.name,
              endDate: sprint.endDate,
              incompleteTasks: incompleteCount,
              warning: true,
            },
          })),
        );

        // Emails
        for (const member of members) {
          await sendNotificationEmail(
            member.email,
            member.name,
            `Reminder: Sprint "${sprint.name}" Ends Tomorrow`,
            message,
            `${process.env.FRONTEND_URL}/projects/portal/${sprint.projectId}/sprint`,
          );
        }

        // Real-time warning
        if (io) {
          io.to(`project:${sprint.projectId}`).emit("sprint:expiryWarning", {
            sprintId: sprint._id,
            sprintName: sprint.name,
            endDate: sprint.endDate,
            incompleteTasks: incompleteCount,
          });
        }
      }

      console.log(`[CRON] Warning sent for sprint "${sprint.name}".`);
    } catch (err) {
      console.error(
        `[CRON] Error sending warning for sprint ${sprint._id}:`,
        err.message,
      );
    }
  }
};

const setupCronJobs = (io) => {
  // Midnight: auto-complete overdue sprints
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Running midnight scheduled tasks...");
    try {
      await handleOverdueSprints(io);
    } catch (err) {
      console.error("[CRON] handleOverdueSprints failed:", err.message);
    }
  });

  // 9 AM: warn teams about sprints ending tomorrow
  cron.schedule("0 9 * * *", async () => {
    console.log("[CRON] Running 9 AM sprint warning check...");
    try {
      await handleSprintExpiryWarnings(io);
    } catch (err) {
      console.error("[CRON] handleSprintExpiryWarnings failed:", err.message);
    }
  });

  console.log("[CRON] Cron jobs registered: midnight expiry + 9 AM warning.");
};

module.exports = { setupCronJobs };
