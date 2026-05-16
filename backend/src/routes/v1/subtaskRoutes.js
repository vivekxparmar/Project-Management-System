const express = require("express");
const router = express.Router();
const {
  createSubtask,
  updateSubtask,
  deleteSubtask,
} = require("../../controllers/subtaskController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

router.use(protect);

router.post("/", checkProjectPermission("createTask"), createSubtask);
router.put("/:id", checkProjectPermission("editTask"), updateSubtask);
router.delete("/:id", checkProjectPermission("deleteTask"), deleteSubtask);

module.exports = router;
