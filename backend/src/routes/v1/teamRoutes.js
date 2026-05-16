const express = require("express");
const router = express.Router();
const {
  getTeamMembers,
  addTeamMember,
  updateMemberRole,
  removeTeamMember,
  leaveProject,
  sendInvitation,
  acceptInvitation,
  transferOwnership,
} = require("../../controllers/teamController");
const { protect } = require("../../middleware/authMiddleware");
const {
  isProjectOwnerOrAdmin,
  isProjectOwner,
} = require("../../middleware/rbacMiddleware");

// All team routes require authentication
router.use(protect);

// Get team members
router.get("/:projectId", getTeamMembers);

// Add member (Owner/Admin only)
router.post("/:projectId", isProjectOwnerOrAdmin, addTeamMember);

// Update member role (Owner/Admin only)
router.put("/:projectId/:userId", isProjectOwnerOrAdmin, updateMemberRole);

// Remove member (Owner/Admin only)
router.delete("/:projectId/:userId", isProjectOwnerOrAdmin, removeTeamMember);

// Leave project (authenticated user)
router.post("/:projectId/leave", leaveProject);

// Send invitation (Owner/Admin only)
router.post("/:projectId/invite", isProjectOwnerOrAdmin, sendInvitation);

// Accept invitation (authenticated)
router.post("/invite/:token", acceptInvitation);

// Transfer ownership (Owner only)
router.post("/:projectId/transfer", isProjectOwner, transferOwnership);

module.exports = router;
