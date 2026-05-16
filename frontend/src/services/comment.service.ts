import api from "./axios";

export const commentService = {
  // Get all comments for a bug
  getAll: (bugId: string, projectId: string) =>
    api.get(`/comments/bug/${bugId}`, { data: { projectId } }),

  // Add a comment to a bug
  create: (bugId: string, content: string, projectId: string | undefined) =>
    api.post("/comments", { bugId, content, projectId }),

  // Edit a comment
  update: (commentId: string, content: string, projectId: string | undefined) =>
    api.put(`/comments/${commentId}`, { content, projectId }),

  // Delete a comment
  delete: (commentId: string, projectId: string | undefined) =>
    api.delete(`/comments/${commentId}`, { data: { projectId } }),
};
