import api from "./axios";
import type { CreateSprintPayload, UpdateSprintPayload } from "../types";

export const sprintService = {
  // Get all sprints for a project
  getAll: (projectId: string) => api.get(`/sprints/project/${projectId}`),

  // Get single sprint
  getById: (sprintId: string) => api.get(`/sprints/${sprintId}`),

  // Create sprint
  create: (data: CreateSprintPayload) => api.post("/sprints", data),

  // Edit sprint
  update: (sprintId: string, data: UpdateSprintPayload) =>
    api.put(`/sprints/${sprintId}`, data),

  // Change status (Planned | Active | Completed)
  updateStatus: (sprintId: string, status: string, projectId: string) =>
    api.put(`/sprints/${sprintId}/status`, { status, projectId }),

  // Lock / unlock sprint
  toggleLock: (sprintId: string, projectId: string, lock: boolean) =>
    api.put(`/sprints/${sprintId}/lock`, { lock, projectId }),

  // Delete sprint
  delete: (sprintId: string, projectId: string) =>
    api.delete(`/sprints/${sprintId}`, { data: { projectId } }),
};
