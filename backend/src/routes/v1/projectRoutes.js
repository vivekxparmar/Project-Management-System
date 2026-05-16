const express = require("express");
const router = express.Router();
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  updateProjectStatus,
} = require("../../controllers/projectController");
const { protect } = require("../../middleware/authMiddleware");
const {
  checkProjectPermission,
  isProjectOwner,
} = require("../../middleware/rbacMiddleware");

// All routes require authentication
router.use(protect);

// Project CRUD
router.route("/").get(getProjects).post(createProject);

router
  .route("/:projectId")
  .get(checkProjectPermission("viewResources"), getProject)
  .put(checkProjectPermission("changeSettings"), updateProject)
  .delete(isProjectOwner, deleteProject);

// Project status update (for Kanban)
router.put(
  "/:projectId/status",
  checkProjectPermission("changeSettings"),
  updateProjectStatus,
);

// Archive/Restore
router.put(
  "/:projectId/archive",
  checkProjectPermission("archiveProject"),
  archiveProject,
);
router.put(
  "/:projectId/restore",
  checkProjectPermission("archiveProject"),
  restoreProject,
);

module.exports = router;
