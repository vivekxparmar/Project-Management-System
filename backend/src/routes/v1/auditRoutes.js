const express = require("express");
const router = express.Router();
const {
  getAuditLogs,
  getAuditSummary,
  getMyActivity,
  exportAuditLogs,
  getAuditLogById,
  revertAction,
  getAuditTimeline,
} = require("../../controllers/auditController");
const { protect } = require("../../middleware/authMiddleware");
const {
  checkProjectPermission,
  isProjectOwnerOrAdmin,
} = require("../../middleware/rbacMiddleware");

router.use(protect);

// My activity across all projects
router.get("/my-activity", getMyActivity);

// Project audit routes
router.get(
  "/project/:projectId",
  checkProjectPermission("viewAuditLog"),
  getAuditLogs,
);
router.get(
  "/:projectId/summary",
  checkProjectPermission("viewAuditLog"),
  getAuditSummary,
);
router.get(
  "/:projectId/export",
  checkProjectPermission("viewAuditLog"),
  exportAuditLogs,
);
router.get(
  "/:projectId/timeline",
  checkProjectPermission("viewAuditLog"),
  getAuditTimeline,
);

// Single audit log
router.get("/log/:id", checkProjectPermission("viewAuditLog"), getAuditLogById);

// Revert action (admin only)
router.post("/:id/revert", isProjectOwnerOrAdmin, revertAction);

module.exports = router;
