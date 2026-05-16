const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateGeneralSettings,
  updateSprintDefaults,
  updateNotificationSettings,
  updateIntegrations,
  addCustomLabel,
  updateCustomLabel,
  deleteCustomLabel,
  getCustomLabels,
  archiveProject,
  restoreArchivedProject,
  deleteProject,
  transferOwnership,
} = require("../../controllers/settingsController");
const { protect } = require("../../middleware/authMiddleware");
const {
  isProjectOwnerOrAdmin,
  isProjectOwner,
} = require("../../middleware/rbacMiddleware");

router.use(protect);

// Main settings
router.get("/:projectId", isProjectOwnerOrAdmin, getSettings);

// General settings
router.put("/:projectId/general", isProjectOwnerOrAdmin, updateGeneralSettings);

// Sprint defaults
router.put(
  "/:projectId/sprint-defaults",
  isProjectOwnerOrAdmin,
  updateSprintDefaults,
);

// Notification settings
router.put(
  "/:projectId/notifications",
  isProjectOwnerOrAdmin,
  updateNotificationSettings,
);

// Integrations
router.put(
  "/:projectId/integrations",
  isProjectOwnerOrAdmin,
  updateIntegrations,
);

// Custom labels
router.get("/:projectId/labels", getCustomLabels);
router.post("/:projectId/labels", isProjectOwnerOrAdmin, addCustomLabel);
router.put(
  "/:projectId/labels/:labelId",
  isProjectOwnerOrAdmin,
  updateCustomLabel,
);
router.delete(
  "/:projectId/labels/:labelId",
  isProjectOwnerOrAdmin,
  deleteCustomLabel,
);

// Danger zone (owner only)
router.post("/:projectId/archive", isProjectOwnerOrAdmin, archiveProject);
router.post(
  "/:projectId/restore",
  isProjectOwnerOrAdmin,
  restoreArchivedProject,
);
router.delete("/:projectId/delete", isProjectOwner, deleteProject);
router.post(
  "/:projectId/transfer-ownership",
  isProjectOwner,
  transferOwnership,
);

module.exports = router;
