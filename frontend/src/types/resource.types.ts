export type ResourceType =
  | "url"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "file"
  | "other";

export interface Resource {
  _id: string;
  projectId: string;
  name: string;
  description: string;
  resourceType: ResourceType;
  url: string;
  publicId: string;
  originalName: string;
  fileSize: number;
  uploadedBy: {
    _id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
}
