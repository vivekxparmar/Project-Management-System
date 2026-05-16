import type { Priority } from "./sprint.types";

export type BugStatus =
  | "Open"
  | "In Progress"
  | "In Review"
  | "Fixed"
  | "Closed";

export interface BugUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface BugAttachment {
  _id: string;
  url: string;
  publicId: string;
  type: string;
  originalName: string;
}

export interface BugComment {
  _id: string;
  bug: string;
  author: BugUser;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bug {
  _id: string;
  bugNumber: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: Priority;
  projectId: string;
  reportedBy: BugUser;
  assignee: BugUser | null;
  attachments: BugAttachment[];
  commentsCount: number;
  trackedTime: number;
  activeTimerStart: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBugPayload {
  title: string;
  description?: string;
  projectId: string;
  priority?: Priority;
  assigneeId?: string;
  images?: File[];
  attachments?: BugAttachment[];
}

export interface UpdateBugPayload {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: BugStatus;
  assigneeId?: string | null;
  projectId: string;
}
