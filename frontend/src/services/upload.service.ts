import api from "./axios";

export const uploadService = {
  uploadFile: async (file: File, folder: string = "bugs") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteFile: async (publicId: string) => {
    const response = await api.delete(`/upload/${publicId}`);
    return response.data;
  },
};
