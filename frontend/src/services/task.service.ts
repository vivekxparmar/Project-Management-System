import api from "./axios";
import type {
  CreateTaskPayload,
  CreateBacklogTaskPayload,
  UpdateTaskPayload,
} from "../types";

export const taskService = {
  // Get all tasks for a sprint (with subtasks populated)
  getBySprint: (sprintId: string) => api.get(`/tasks/sprint/${sprintId}`),

  // Get all backlog tasks for a project
  getBacklog: (projectId: string) => api.get(`/backlog/${projectId}`),

  // Create task in sprint
  create: (data: CreateTaskPayload) => api.post("/tasks", data),

  // Create task directly in backlog
  createBacklog: (data: CreateBacklogTaskPayload) => api.post("/tasks", data),

  // Update task (title, priority, assignee, status)
  update: (taskId: string, data: UpdateTaskPayload) =>
    api.put(`/tasks/${taskId}`, data),

  // Delete task
  delete: (taskId: string, projectId: string) =>
    api.delete(`/tasks/${taskId}`, { data: { projectId } }),

  // Move task to backlog
  moveToBacklog: (taskId: string, projectId: string) =>
    api.post(`/tasks/${taskId}/move-to-backlog`, { projectId }),

  // Move task to sprint
  moveToSprint: (taskId: string, sprintId: string, projectId: string) =>
    api.post(`/tasks/${taskId}/move-to-sprint`, { sprintId, projectId }),

  refreshAssignees: async (taskId: string) => {
    const response = await api.post(`/tasks/${taskId}/refresh-assignees`);
    return response.data;
  },
};
