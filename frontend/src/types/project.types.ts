export type ProjectStatus = "Not Started" | "Active" | "Paused" | "Completed";

import type { Priority } from "./sprint.types";

export type MemberRole =
  | "Owner"
  | "Admin"
  | "Developer"
  | "Designer"
  | "Client";

export interface ProjectMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  role: MemberRole;
  joinedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
  };
  members: ProjectMember[];
  settings: {
    defaultSprintDuration: number;
    defaultTaskEstimate: number;
    defaultPriority: Priority;
    notificationPreferences: Record<string, boolean>;
    integrations: {
      github: string;
      slackWebhook: string;
    };
    customLabels: string[];
  };
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // derived — my role in this project
  myRole?: MemberRole;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
}
