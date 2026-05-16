export type NotificationType =
  // Task related
  | "task_assigned"
  | "task_updated"
  | "task_deleted"
  | "task_created"
  | "task_unassigned"
  | "task_moved"
  | "task_moved_to_backlog"

  // Subtask related
  | "subtask_assigned"
  | "subtask_updated"
  | "subtask_deleted"
  | "subtask_created"
  | "subtask_unassigned"

  // Bug related
  | "bug_reported"
  | "bug_assigned"
  | "bug_updated"
  | "bug_deleted"
  | "bug_unassigned"

  // Sprint related
  | "sprint_created"
  | "sprint_updated"
  | "sprint_started"
  | "sprint_completed"
  | "sprint_planning"
  | "sprint_expired"
  | "sprint_locked"
  | "sprint_unlocked"
  | "sprint_deleted"

  // Project related
  | "project_updated"
  | "project_archived"
  | "project_status_changed"

  // Team related
  | "team_member_added"
  | "team_member_removed"
  | "role_changed"

  // Resource related
  | "resource_added"
  | "resource_deleted"

  // Comment related
  | "comment_added"
  | "mention";

export interface Notification {
  _id: string;
  userId: string;
  projectId: {
    _id: string;
    name: string;
  } | null;
  type: NotificationType;
  title: string;
  message: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  data: Record<string, any>;
  isRead: boolean;
  emailSent: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}
