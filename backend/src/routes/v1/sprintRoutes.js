const express = require("express");
const router = express.Router();
const {
  createSprint,
  getSprintsByProject,
  getSprint,
  updateSprint,
  deleteSprint,
  changeSprintStatus,
  toggleSprintLock,
} = require("../../controllers/sprintController");
const { protect } = require("../../middleware/authMiddleware");
const {
  checkProjectPermission,
  isProjectOwnerOrAdmin,
} = require("../../middleware/rbacMiddleware");

router.use(protect);

router.route("/").post(checkProjectPermission("manageSprint"), createSprint);

router.get(
  "/project/:projectId",
  checkProjectPermission("viewResources"),
  getSprintsByProject,
);

router
  .route("/:id")
  .get(checkProjectPermission("viewResources"), getSprint)
  .put(checkProjectPermission("manageSprint"), updateSprint)
  .delete(checkProjectPermission("manageSprint"), deleteSprint);

router.put(
  "/:id/status",
  checkProjectPermission("manageSprint"),
  changeSprintStatus,
);
router.put("/:id/lock", isProjectOwnerOrAdmin, toggleSprintLock);

module.exports = router;
