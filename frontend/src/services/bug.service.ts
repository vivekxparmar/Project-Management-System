import api from "./axios";
import type { CreateBugPayload, UpdateBugPayload } from "../types";

export const bugService = {
  getAll: (projectId: string, params?: Record<string, string>) =>
    api.get(`/bugs/project/${projectId}`, { params }),

  getById: (bugId: string) => api.get(`/bugs/${bugId}`),

  // Create bug with attachments 
  create: (data: CreateBugPayload) => {
    const { images, ...bugData } = data;
    return api.post("/bugs", bugData);
  },

  update: (bugId: string, data: UpdateBugPayload) =>
    api.put(`/bugs/${bugId}`, data),

  updateStatus: (bugId: string, status: string, projectId: string) =>
    api.put(`/bugs/${bugId}`, { status, projectId }),

  updateAssignee: (
    bugId: string,
    assigneeId: string | null,
    projectId: string,
  ) => api.put(`/bugs/${bugId}`, { assigneeId, projectId }),

  deleteAttachment: (bugId: string, attachmentId: string, projectId: string) =>
    api.delete(`/bugs/${bugId}/attachments/${attachmentId}`, {
      data: { projectId },
    }),

  delete: (bugId: string, projectId: string) =>
    api.delete(`/bugs/${bugId}`, { data: { projectId } }),
};
