const express = require("express");
const router = express.Router();
const {
  createTask,
  getTasksBySprint,
  updateTask,
  deleteTask,
  moveTaskToSprint,
  moveTaskToBacklog,
  refreshTaskAssignees,
} = require("../../controllers/taskController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

router.use(protect);

router.post("/", checkProjectPermission("createTask"), createTask);
router.get("/sprint/:sprintId", getTasksBySprint);
router.put("/:id", checkProjectPermission("editTask"), updateTask);
router.delete("/:id", checkProjectPermission("deleteTask"), deleteTask);
router.post(
  "/:id/move-to-sprint",
  checkProjectPermission("editTask"),
  moveTaskToSprint,
);
router.post(
  "/:id/move-to-backlog",
  checkProjectPermission("editTask"),
  moveTaskToBacklog,
);

router.post("/:id/refresh-assignees", refreshTaskAssignees);

module.exports = router;
