const express = require("express");
const router = express.Router();
const {
  getDashboardData,
  getTaskStats,
  getBugStats,
  getSprintStats,
  getBurndownData,
  getVelocityData,
  getTimelineData,
  getTeamPerformance,
  getActivityHeatmap,
} = require("../../controllers/dashboardController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

router.use(protect);

// Main dashboard endpoint
router.get(
  "/:projectId",
  checkProjectPermission("viewResources"),
  getDashboardData,
);

// Individual chart endpoints (for real-time updates)
router.get(
  "/:projectId/tasks",
  checkProjectPermission("viewResources"),
  getTaskStats,
);
router.get(
  "/:projectId/bugs",
  checkProjectPermission("viewResources"),
  getBugStats,
);
router.get(
  "/:projectId/sprints",
  checkProjectPermission("viewResources"),
  getSprintStats,
);
router.get(
  "/:projectId/burndown",
  checkProjectPermission("viewResources"),
  getBurndownData,
);
router.get(
  "/:projectId/velocity",
  checkProjectPermission("viewResources"),
  getVelocityData,
);
router.get(
  "/:projectId/timeline",
  checkProjectPermission("viewResources"),
  getTimelineData,
);
router.get(
  "/:projectId/team-performance",
  checkProjectPermission("viewResources"),
  getTeamPerformance,
);
router.get(
  "/:projectId/heatmap",
  checkProjectPermission("viewResources"),
  getActivityHeatmap,
);

module.exports = router;
