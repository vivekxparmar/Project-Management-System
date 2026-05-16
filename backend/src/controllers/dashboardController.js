const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Task = require("../models/Task");
const Subtask = require("../models/Subtask");
const Bug = require("../models/Bug");
const Resource = require("../models/Resource");
const AuditLog = require("../models/AuditLog");
const {
  TASK_STATUS,
  BUG_STATUS,
  SPRINT_STATUS,
  PRIORITIES,
} = require("../utils/constants");

// @desc    Get complete dashboard data
// @route   GET /api/v1/dashboard/:projectId
// @access  Private
const getDashboardData = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { timeframe = "month" } = req.query;

    // Get date range based on timeframe
    const dateRange = getDateRange(timeframe);

    // Fetch all data in parallel for better performance
    const [
      project,
      sprints,
      tasks,
      subtasks,
      bugs,
      resources,
      auditLogs,
      taskStats,
      bugStats,
      sprintStats,
      burndownData,
      velocityData,
    ] = await Promise.all([
      Project.findById(projectId).select("name description status createdAt"),
      Sprint.find({ projectId }).sort({ createdAt: -1 }),
      Task.find({ projectId }),
      Subtask.find({ projectId }),
      Bug.find({ projectId }),
      Resource.find({ projectId }),
      AuditLog.find({ projectId, createdAt: { $gte: dateRange.start } }),
      getTaskStats(projectId),
      getBugStats(projectId),
      getSprintStats(projectId),
      getBurndownData(projectId),
      getVelocityData(projectId),
    ]);

    // Calculate timeline data
    const timelineData = await getTimelineData(projectId, dateRange);

    // Calculate team performance
    const teamPerformance = await getTeamPerformance(projectId, dateRange);

    // Calculate resource usage
    const resourceUsage = {
      total: resources.length,
      byType: {
        image: resources.filter((r) => r.resourceType === "image").length,
        video: resources.filter((r) => r.resourceType === "video").length,
        document: resources.filter((r) => r.resourceType === "document").length,
        url: resources.filter((r) => r.resourceType === "url").length,
        other: resources.filter(
          (r) =>
            !["image", "video", "document", "url"].includes(r.resourceType),
        ).length,
      },
      recent: resources.slice(0, 5),
    };

    // Calculate activity heatmap
    const activityHeatmap = await getActivityHeatmap(projectId, dateRange);

    // Calculate project health score
    const healthScore = calculateProjectHealth(tasks, bugs, sprints);

    res.status(200).json({
      success: true,
      data: {
        project: {
          id: project._id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt,
          healthScore,
        },
        overview: {
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t) => t.status === TASK_STATUS.DONE)
            .length,
          inProgressTasks: tasks.filter(
            (t) => t.status === TASK_STATUS.IN_PROGRESS,
          ).length,
          totalBugs: bugs.length,
          openBugs: bugs.filter((b) => b.status === BUG_STATUS.OPEN).length,
          resolvedBugs: bugs.filter(
            (b) =>
              b.status === BUG_STATUS.CLOSED || b.status === BUG_STATUS.FIXED,
          ).length,
          totalSprints: sprints.length,
          activeSprints: sprints.filter(
            (s) => s.status === SPRINT_STATUS.ACTIVE,
          ).length,
          completionRate:
            tasks.length > 0
              ? Math.round(
                  (tasks.filter((t) => t.status === TASK_STATUS.DONE).length /
                    tasks.length) *
                    100,
                )
              : 0,
        },
        taskStats,
        bugStats,
        sprintStats,
        charts: {
          burndown: burndownData,
          velocity: velocityData,
          timeline: timelineData,
          activityHeatmap,
          taskDistribution: getTaskDistribution(tasks),
          priorityDistribution: getPriorityDistribution(tasks, bugs),
          statusDistribution: getStatusDistribution(tasks, bugs),
        },
        teamPerformance,
        resourceUsage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task statistics
// @route   GET /api/v1/dashboard/:projectId/tasks
// @access  Private
const getTaskStats = async (projectId) => {
  try {
    const tasks = await Task.find({ projectId });
    const subtasks = await Subtask.find({ projectId });

    const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
    const totalTrackedTime = tasks.reduce(
      (sum, t) => sum + (t.trackedTime || 0),
      0,
    );
    const remainingEstimate = tasks
      .filter((t) => t.status !== TASK_STATUS.DONE)
      .reduce((sum, t) => sum + (t.estimate || 0), 0);

    const tasksByAssignee = {};
    tasks.forEach((task) => {
      if (task.assignee) {
        const assigneeId = task.assignee.toString();
        if (!tasksByAssignee[assigneeId]) {
          tasksByAssignee[assigneeId] = {
            assigned: 0,
            completed: 0,
            inProgress: 0,
          };
        }
        tasksByAssignee[assigneeId].assigned++;
        if (task.status === TASK_STATUS.DONE)
          tasksByAssignee[assigneeId].completed++;
        if (task.status === TASK_STATUS.IN_PROGRESS)
          tasksByAssignee[assigneeId].inProgress++;
      }
    });

    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === TASK_STATUS.DONE).length,
      inProgress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS)
        .length,
      todo: tasks.filter((t) => t.status === TASK_STATUS.TODO).length,
      totalEstimate: Math.round(totalEstimate * 10) / 10,
      totalTrackedTime: Math.round(totalTrackedTime * 10) / 10,
      remainingEstimate: Math.round(remainingEstimate * 10) / 10,
      efficiency:
        totalTrackedTime > 0
          ? Math.round((totalEstimate / totalTrackedTime) * 100)
          : 0,
      byAssignee: tasksByAssignee,
      subtasks: {
        total: subtasks.length,
        completed: subtasks.filter((s) => s.status === TASK_STATUS.DONE).length,
        inProgress: subtasks.filter((s) => s.status === TASK_STATUS.IN_PROGRESS)
          .length,
      },
    };
  } catch (error) {
    console.error("Error getting task stats:", error);
    return {};
  }
};

// @desc    Get bug statistics
// @route   GET /api/v1/dashboard/:projectId/bugs
// @access  Private
const getBugStats = async (projectId) => {
  try {
    const bugs = await Bug.find({ projectId });

    const bugsByPriority = {};
    Object.values(PRIORITIES).forEach((priority) => {
      bugsByPriority[priority] = bugs.filter(
        (b) => b.priority === priority,
      ).length;
    });

    const bugsByStatus = {};
    Object.values(BUG_STATUS).forEach((status) => {
      bugsByStatus[status] = bugs.filter((b) => b.status === status).length;
    });

    const averageResolutionTime = calculateAverageResolutionTime(bugs);

    return {
      total: bugs.length,
      open: bugs.filter((b) => b.status === BUG_STATUS.OPEN).length,
      inProgress: bugs.filter((b) => b.status === BUG_STATUS.IN_PROGRESS)
        .length,
      inReview: bugs.filter((b) => b.status === BUG_STATUS.IN_REVIEW).length,
      fixed: bugs.filter((b) => b.status === BUG_STATUS.FIXED).length,
      closed: bugs.filter((b) => b.status === BUG_STATUS.CLOSED).length,
      byPriority: bugsByPriority,
      byStatus: bugsByStatus,
      averageResolutionTime, // in hours
      criticalBugs: bugs.filter(
        (b) => b.priority === PRIORITIES.P0 && b.status !== BUG_STATUS.CLOSED,
      ).length,
    };
  } catch (error) {
    console.error("Error getting bug stats:", error);
    return {};
  }
};

// @desc    Get sprint statistics
// @route   GET /api/v1/dashboard/:projectId/sprints
// @access  Private
const getSprintStats = async (projectId) => {
  try {
    const sprints = await Sprint.find({ projectId });
    const completedSprints = sprints.filter(
      (s) => s.status === SPRINT_STATUS.COMPLETED,
    );

    let totalPlannedPoints = 0;
    let totalCompletedPoints = 0;
    let totalSprintDays = 0;

    for (const sprint of completedSprints) {
      const tasks = await Task.find({ sprintId: sprint._id });
      const plannedPoints = tasks.reduce(
        (sum, t) => sum + (t.estimate || 0),
        0,
      );
      const completedPoints = tasks
        .filter((t) => t.status === TASK_STATUS.DONE)
        .reduce((sum, t) => sum + (t.estimate || 0), 0);

      totalPlannedPoints += plannedPoints;
      totalCompletedPoints += completedPoints;

      const sprintDays = Math.ceil(
        (sprint.endDate - sprint.startDate) / (1000 * 60 * 60 * 24),
      );
      totalSprintDays += sprintDays;
    }

    const averageVelocity =
      completedSprints.length > 0
        ? Math.round((totalCompletedPoints / completedSprints.length) * 10) / 10
        : 0;

    return {
      total: sprints.length,
      planned: sprints.filter((s) => s.status === SPRINT_STATUS.PLANNED).length,
      active: sprints.filter((s) => s.status === SPRINT_STATUS.ACTIVE).length,
      completed: completedSprints.length,
      averageVelocity,
      totalPlannedPoints: Math.round(totalPlannedPoints * 10) / 10,
      totalCompletedPoints: Math.round(totalCompletedPoints * 10) / 10,
      completionRate:
        totalPlannedPoints > 0
          ? Math.round((totalCompletedPoints / totalPlannedPoints) * 100)
          : 0,
      averageSprintDays:
        completedSprints.length > 0
          ? Math.round(totalSprintDays / completedSprints.length)
          : 0,
    };
  } catch (error) {
    console.error("Error getting sprint stats:", error);
    return {};
  }
};

// @desc    Get burndown chart data
// @route   GET /api/v1/dashboard/:projectId/burndown
// @access  Private
const getBurndownData = async (projectId) => {
  try {
    const activeSprint = await Sprint.findOne({
      projectId,
      status: SPRINT_STATUS.ACTIVE,
    });

    if (!activeSprint) {
      return { hasActiveSprint: false, data: [] };
    }

    const sprintDuration = Math.ceil(
      (activeSprint.endDate - activeSprint.startDate) / (1000 * 60 * 60 * 24),
    );
    const tasks = await Task.find({ sprintId: activeSprint._id });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.estimate || 0), 0);

    // Generate ideal burndown line
    const idealBurndown = [];
    const actualBurndown = [];

    for (let i = 0; i <= sprintDuration; i++) {
      const date = new Date(activeSprint.startDate);
      date.setDate(date.getDate() + i);

      // Ideal points remaining
      const idealRemaining = totalPoints * (1 - i / sprintDuration);
      idealBurndown.push({
        day: i,
        date: date.toISOString().split("T")[0],
        remainingPoints: Math.round(idealRemaining * 10) / 10,
      });

      // Actual points remaining (calculate based on tasks completed by this date)
      const completedByDate = tasks.filter(
        (t) => t.status === TASK_STATUS.DONE && t.updatedAt <= date,
      );
      const actualRemaining =
        totalPoints -
        completedByDate.reduce((sum, t) => sum + (t.estimate || 0), 0);
      actualBurndown.push({
        day: i,
        date: date.toISOString().split("T")[0],
        remainingPoints: Math.round(actualRemaining * 10) / 10,
      });
    }

    return {
      hasActiveSprint: true,
      sprintName: activeSprint.name,
      startDate: activeSprint.startDate,
      endDate: activeSprint.endDate,
      totalPoints: Math.round(totalPoints * 10) / 10,
      ideal: idealBurndown,
      actual: actualBurndown,
    };
  } catch (error) {
    console.error("Error getting burndown data:", error);
    return { hasActiveSprint: false, data: [] };
  }
};

// @desc    Get velocity chart data
// @route   GET /api/v1/dashboard/:projectId/velocity
// @access  Private
const getVelocityData = async (projectId) => {
  try {
    const completedSprints = await Sprint.find({
      projectId,
      status: SPRINT_STATUS.COMPLETED,
    })
      .sort({ endDate: -1 })
      .limit(6);

    const velocityData = [];
    for (const sprint of completedSprints.reverse()) {
      const tasks = await Task.find({ sprintId: sprint._id });
      const completedPoints = tasks
        .filter((t) => t.status === TASK_STATUS.DONE)
        .reduce((sum, t) => sum + (t.estimate || 0), 0);

      velocityData.push({
        sprintName: sprint.name,
        sprintNumber: velocityData.length + 1,
        completedPoints: Math.round(completedPoints * 10) / 10,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      });
    }

    const averageVelocity =
      velocityData.length > 0
        ? Math.round(
            (velocityData.reduce((sum, v) => sum + v.completedPoints, 0) /
              velocityData.length) *
              10,
          ) / 10
        : 0;

    return {
      sprints: velocityData,
      averageVelocity,
      trend:
        velocityData.length >= 2
          ? velocityData[velocityData.length - 1].completedPoints -
            velocityData[0].completedPoints
          : 0,
    };
  } catch (error) {
    console.error("Error getting velocity data:", error);
    return { sprints: [], averageVelocity: 0 };
  }
};

// @desc    Get timeline data for charts
// @route   GET /api/v1/dashboard/:projectId/timeline
// @access  Private
const getTimelineData = async (projectId, dateRange) => {
  try {
    const tasks = await Task.find({
      projectId,
      createdAt: { $gte: dateRange.start },
    });

    const bugs = await Bug.find({
      projectId,
      createdAt: { $gte: dateRange.start },
    });

    // Group by date
    const timelineMap = new Map();

    tasks.forEach((task) => {
      const date = task.createdAt.toISOString().split("T")[0];
      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          tasksCreated: 0,
          tasksCompleted: 0,
          bugsCreated: 0,
          bugsResolved: 0,
        });
      }
      timelineMap.get(date).tasksCreated++;

      if (
        task.status === TASK_STATUS.DONE &&
        task.updatedAt >= dateRange.start
      ) {
        const completedDate = task.updatedAt.toISOString().split("T")[0];
        if (!timelineMap.has(completedDate)) {
          timelineMap.set(completedDate, {
            date: completedDate,
            tasksCreated: 0,
            tasksCompleted: 0,
            bugsCreated: 0,
            bugsResolved: 0,
          });
        }
        timelineMap.get(completedDate).tasksCompleted++;
      }
    });

    bugs.forEach((bug) => {
      const date = bug.createdAt.toISOString().split("T")[0];
      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          tasksCreated: 0,
          tasksCompleted: 0,
          bugsCreated: 0,
          bugsResolved: 0,
        });
      }
      timelineMap.get(date).bugsCreated++;

      if (
        (bug.status === BUG_STATUS.CLOSED || bug.status === BUG_STATUS.FIXED) &&
        bug.updatedAt >= dateRange.start
      ) {
        const resolvedDate = bug.updatedAt.toISOString().split("T")[0];
        if (!timelineMap.has(resolvedDate)) {
          timelineMap.set(resolvedDate, {
            date: resolvedDate,
            tasksCreated: 0,
            tasksCompleted: 0,
            bugsCreated: 0,
            bugsResolved: 0,
          });
        }
        timelineMap.get(resolvedDate).bugsResolved++;
      }
    });

    return Array.from(timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  } catch (error) {
    console.error("Error getting timeline data:", error);
    return [];
  }
};

// @desc    Get team performance metrics
// @route   GET /api/v1/dashboard/:projectId/team-performance
// @access  Private
const getTeamPerformance = async (projectId, dateRange) => {
  try {
    const tasks = await Task.find({
      projectId,
      createdAt: { $gte: dateRange.start },
    }).populate("assignee", "name email avatar");

    const taskCompletionByUser = new Map();

    tasks.forEach((task) => {
      if (task.assignee) {
        const userId = task.assignee._id.toString();
        if (!taskCompletionByUser.has(userId)) {
          taskCompletionByUser.set(userId, {
            user: task.assignee,
            assigned: 0,
            completed: 0,
            totalEstimate: 0,
            totalTrackedTime: 0,
          });
        }
        const stats = taskCompletionByUser.get(userId);
        stats.assigned++;
        stats.totalEstimate += task.estimate || 0;
        stats.totalTrackedTime += task.trackedTime || 0;
        if (task.status === TASK_STATUS.DONE) {
          stats.completed++;
        }
      }
    });

    const teamPerformance = Array.from(taskCompletionByUser.values()).map(
      (stats) => ({
        user: stats.user,
        assigned: stats.assigned,
        completed: stats.completed,
        completionRate:
          stats.assigned > 0
            ? Math.round((stats.completed / stats.assigned) * 100)
            : 0,
        totalEstimate: Math.round(stats.totalEstimate * 10) / 10,
        totalTrackedTime: Math.round(stats.totalTrackedTime * 10) / 10,
        efficiency:
          stats.totalTrackedTime > 0
            ? Math.round((stats.totalEstimate / stats.totalTrackedTime) * 100)
            : 0,
      }),
    );

    return teamPerformance.sort((a, b) => b.completionRate - a.completionRate);
  } catch (error) {
    console.error("Error getting team performance:", error);
    return [];
  }
};

// @desc    Get activity heatmap data
// @route   GET /api/v1/dashboard/:projectId/heatmap
// @access  Private
const getActivityHeatmap = async (projectId, dateRange) => {
  try {
    const auditLogs = await AuditLog.find({
      projectId,
      createdAt: { $gte: dateRange.start },
    });

    const heatmap = new Map();

    auditLogs.forEach((log) => {
      const hour = log.createdAt.getHours();
      const day = log.createdAt.getDay();
      const key = `${day}-${hour}`;

      if (!heatmap.has(key)) {
        heatmap.set(key, { day, hour, count: 0 });
      }
      heatmap.get(key).count++;
    });

    return Array.from(heatmap.values());
  } catch (error) {
    console.error("Error getting activity heatmap:", error);
    return [];
  }
};

// Helper function to get date range
const getDateRange = (timeframe) => {
  const end = new Date();
  let start = new Date();

  switch (timeframe) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
};

// Helper function to get task distribution
const getTaskDistribution = (tasks) => {
  return {
    todo: tasks.filter((t) => t.status === TASK_STATUS.TODO).length,
    inProgress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS)
      .length,
    done: tasks.filter((t) => t.status === TASK_STATUS.DONE).length,
  };
};

// Helper function to get priority distribution
const getPriorityDistribution = (tasks, bugs) => {
  const distribution = {};
  Object.values(PRIORITIES).forEach((priority) => {
    distribution[priority] = {
      tasks: tasks.filter((t) => t.priority === priority).length,
      bugs: bugs.filter((b) => b.priority === priority).length,
      total: 0,
    };
    distribution[priority].total =
      distribution[priority].tasks + distribution[priority].bugs;
  });
  return distribution;
};

// Helper function to get status distribution
const getStatusDistribution = (tasks, bugs) => {
  return {
    tasks: {
      todo: tasks.filter((t) => t.status === TASK_STATUS.TODO).length,
      inProgress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS)
        .length,
      done: tasks.filter((t) => t.status === TASK_STATUS.DONE).length,
    },
    bugs: {
      open: bugs.filter((b) => b.status === BUG_STATUS.OPEN).length,
      inProgress: bugs.filter((b) => b.status === BUG_STATUS.IN_PROGRESS)
        .length,
      inReview: bugs.filter((b) => b.status === BUG_STATUS.IN_REVIEW).length,
      fixed: bugs.filter((b) => b.status === BUG_STATUS.FIXED).length,
      closed: bugs.filter((b) => b.status === BUG_STATUS.CLOSED).length,
    },
  };
};

// Helper function to calculate average resolution time for bugs
const calculateAverageResolutionTime = (bugs) => {
  const resolvedBugs = bugs.filter(
    (b) =>
      (b.status === BUG_STATUS.CLOSED || b.status === BUG_STATUS.FIXED) &&
      b.resolvedAt &&
      b.createdAt,
  );

  if (resolvedBugs.length === 0) return 0;

  const totalHours = resolvedBugs.reduce((sum, bug) => {
    const hours = (bug.resolvedAt - bug.createdAt) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return Math.round((totalHours / resolvedBugs.length) * 10) / 10;
};

// Helper function to calculate project health score
const calculateProjectHealth = (tasks, bugs, sprints) => {
  let score = 100;

  // Task completion impact
  const taskCompletionRate =
    tasks.length > 0
      ? tasks.filter((t) => t.status === TASK_STATUS.DONE).length / tasks.length
      : 1;
  score -= (1 - taskCompletionRate) * 30;

  // Bug impact
  const openBugs = bugs.filter(
    (b) => b.status !== BUG_STATUS.CLOSED && b.status !== BUG_STATUS.FIXED,
  ).length;
  const criticalBugs = bugs.filter(
    (b) => b.priority === PRIORITIES.P0 && b.status !== BUG_STATUS.CLOSED,
  ).length;
  score -= (openBugs / Math.max(bugs.length, 1)) * 20;
  score -= criticalBugs * 5;

  // Sprint performance
  const activeSprints = sprints.filter(
    (s) => s.status === SPRINT_STATUS.ACTIVE,
  ).length;
  if (activeSprints > 1) score -= 10;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Export all functions
module.exports = {
  getDashboardData,
  getTaskStats,
  getBugStats,
  getSprintStats,
  getBurndownData,
  getVelocityData,
  getTimelineData,
  getTeamPerformance,
  getActivityHeatmap,
};
