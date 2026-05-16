import api from "./axios";

export const profileService = {
  // Get current user profile
  getMe: () => api.get("/auth/me"),

  // Update name and/or avatar
  update: (data: { name?: string; avatar?: File }) => {
    if (data.avatar) {
      const formData = new FormData();
      if (data.name) formData.append("name", data.name);
      formData.append("avatar", data.avatar);
      return api.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return api.put("/users/profile", { name: data.name });
  },

  // Change password
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/users/change-password", data),
};
