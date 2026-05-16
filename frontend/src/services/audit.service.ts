import api from "./axios";

export const auditService = {
  // Get audit logs for a project (paginated)
  getAll: (
    projectId: string,
    params?: {
      page?: number;
      limit?: number;
      entityType?: string;
      actor?: string;
    },
  ) => api.get(`/audit/project/${projectId}`, { params }),
};
