import api from "./axios";

export const notificationService = {
  // Get all notifications (paginated)
  getAll: (page = 1, limit = 20) =>
    api.get("/notifications", { params: { page, limit } }),

  // Get unread count only
  getUnreadCount: () => api.get("/notifications/unread/count"),

  // Mark one notification as read
  markRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),

  // Mark all as read
  markAllRead: () => api.put("/notifications/read-all"),

  // Delete a notification
  delete: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`),

  // Delete all notifications
  deleteAll: () => api.delete("/notifications/delete-all"),
};
