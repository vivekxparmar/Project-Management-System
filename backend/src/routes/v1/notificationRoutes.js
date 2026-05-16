const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getPreferences,
  updatePreferences,
  createTestNotification,
} = require("../../controllers/notificationController");
const { protect } = require("../../middleware/authMiddleware");

router.use(protect);

// Notification preferences
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

// Bulk operations
router.put("/read-all", markAllAsRead);
router.delete("/delete-all", deleteAllNotifications);

// Unread count
router.get("/unread/count", getUnreadCount);

// Individual notification operations
router.get("/", getNotifications);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

// Test endpoint (remove in production)
router.post("/test", createTestNotification);

module.exports = router;
