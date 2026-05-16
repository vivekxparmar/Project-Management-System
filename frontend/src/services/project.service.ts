import api from "./axios";
import type { CreateProjectPayload } from "../types";

export const projectService = {
  // Get all projects for current user
  getAll: () => api.get("/projects"),

  // Get archived projects
  getArchived: () => api.get("/projects/archived"),

  // Get single project
  getById: (projectId: string) => api.get(`/projects/${projectId}`),

  // Create project
  create: (data: CreateProjectPayload) => api.post("/projects", data),

  // Update project info / settings
  update: (projectId: string, data: Record<string, any>) =>
    api.put(`/projects/${projectId}`, data),

  // Change kanban status (Not Started | Active | Paused | Completed)
  updateStatus: (projectId: string, status: string) =>
    api.put(`/projects/${projectId}/status`, { status }),

  // Soft delete
  delete: (projectId: string) => api.delete(`/projects/${projectId}`),

  // Archive / unarchive
  archive: (projectId: string) => api.put(`/projects/${projectId}/archive`),

  // Get all members of a project (for assignee dropdowns)
  getMembers: (projectId: string) => api.get(`/team/${projectId}`),
};
