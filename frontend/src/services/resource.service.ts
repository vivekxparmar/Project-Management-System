import api from "./axios";

export const resourceService = {
  // Get all resources for a project
  getAll: (projectId: string) => api.get(`/resources/project/${projectId}`),

  // Upload file to Cloudinary first
  uploadFile: (file: File, folder: string = "resources") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    return api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Add a resource (with two-step upload for files)
  create: async (data: {
    projectId: string;
    name: string;
    description?: string;
    resourceType: string;
    url?: string;
    file?: File;
  }) => {
    // For URL type resources
    if (data.resourceType === "url") {
      return api.post("/resources", {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        resourceType: data.resourceType,
        url: data.url,
      });
    }

    // For file uploads: First upload to Cloudinary
    if (data.file) {
      try {
        // Step 1: Upload file to Cloudinary via your upload endpoint
        const uploadResponse = await resourceService.uploadFile(
          data.file,
          "resources",
        );
        const fileData = uploadResponse.data.data;

        // Step 2: Create resource with the Cloudinary file data
        return api.post("/resources", {
          projectId: data.projectId,
          name: data.name,
          description: data.description,
          resourceType: data.resourceType,
          fileData: {
            url: fileData.url,
            publicId: fileData.publicId,
            size: fileData.size,
            fileType: fileData.mimeType || fileData.type,
            fileName: fileData.fileName,
          },
        });
      } catch (error) {
        console.error("File upload failed:", error);
        throw error;
      }
    }

    // Fallback for when no file is provided
    return api.post("/resources", {
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      resourceType: data.resourceType,
    });
  },

  // Update resource name / description
  update: (resourceId: string, data: { name?: string; description?: string }) =>
    api.put(`/resources/${resourceId}`, data),

  // Delete resource
  delete: (resourceId: string, projectId: string | undefined) =>
    api.delete(`/resources/${resourceId}`, { data: { projectId } }),
};
