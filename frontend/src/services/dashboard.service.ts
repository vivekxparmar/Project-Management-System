import api from "./axios";

export const dashboardService = {
  // Get all dashboard data for a project
  getData: (projectId: string) => api.get(`/dashboard/${projectId}`),
};
