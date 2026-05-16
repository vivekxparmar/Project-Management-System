import api from "./axios";
import type { CreateSubtaskPayload, UpdateSubtaskPayload } from "../types";

export const subtaskService = {
  // Create subtask under a task
  create: (data: CreateSubtaskPayload) => api.post("/subtasks", data),

  // Update subtask (title, status, priority, estimate, assignee)
  update: (subtaskId: string, data: UpdateSubtaskPayload) =>
    api.put(`/subtasks/${subtaskId}`, data),

  // Delete subtask
  delete: (subtaskId: string, projectId: string) =>
    api.delete(`/subtasks/${subtaskId}`, { data: { projectId } }),
};
