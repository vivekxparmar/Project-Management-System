import api from "./axios";

export const teamService = {
  // Get all members of project
  getAll: (projectId: string) => api.get(`/team/${projectId}`),

  // Add member by email
  addMember: (projectId: string, email: string, role: string) =>
    api.post(`/team/${projectId}`, { email, role }),

  // Change member role
  updateRole: (projectId: string, memberId: string, role: string) =>
    api.put(`/team/${projectId}/${memberId}`, { role }),

  // Remove member
  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/team/${projectId}/${memberId}`),

  // Leave project (self)
  leave: (projectId: string) => api.post(`/team/${projectId}/leave`),

  // Send invite by email
  invite: (projectId: string, email: string, role: string) =>
    api.post(`/team/${projectId}/invite`, { email, role }),

  // Accept invite via token
  acceptInvite: (token: string) => api.post(`/team/invite/${token}`),

  // Transfer ownership
  transferOwnership: (projectId: string, newOwnerId: string) =>
    api.post(`/team/${projectId}/transfer`, { newOwnerId }),
};
