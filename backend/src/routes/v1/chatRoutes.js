const express = require("express");
const router = express.Router();
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  getOnlineUsers,
  getUnreadCount,
  markAsRead,
} = require("../../controllers/chatController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

router.use(protect);

// Project chat routes
router.get("/:projectId", checkProjectPermission("viewResources"), getMessages);
router.post(
  "/:projectId",
  checkProjectPermission("viewResources"),
  sendMessage,
);
router.get(
  "/:projectId/online",
  checkProjectPermission("viewResources"),
  getOnlineUsers,
);
router.get(
  "/:projectId/unread",
  checkProjectPermission("viewResources"),
  getUnreadCount,
);
router.post(
  "/:projectId/read",
  checkProjectPermission("viewResources"),
  markAsRead,
);

// Individual message routes
router.put("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);

module.exports = router;
