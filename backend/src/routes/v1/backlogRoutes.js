const express = require("express");
const router = express.Router();
const { getBacklogTasks } = require("../../controllers/backlogController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

router.use(protect);

router.get(
  "/:projectId",
  checkProjectPermission("viewResources"),
  getBacklogTasks,
);

module.exports = router;
