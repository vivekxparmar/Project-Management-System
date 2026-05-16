import api from "./axios";

export const chatService = {
  // Get paginated messages for a project
  getMessages: (projectId: string, page = 1, limit = 50) =>
    api.get(`/chat/${projectId}`, { params: { page, limit } }),

  // Get online users in project
  getOnlineUsers: (projectId: string) => api.get(`/chat/${projectId}/online`),

  getUnreadCount: (projectId: string) => api.get(`/chat/${projectId}/unread`),

  // Mark messages as read
  markRead: (projectId: string) => api.post(`/chat/${projectId}/read`),

  // Edit a message
  editMessage: (messageId: string, content: string) =>
    api.put(`/chat/${messageId}`, { content }),

  // Delete a message
  deleteMessage: (messageId: string) => api.delete(`/chat/${messageId}`),
};
