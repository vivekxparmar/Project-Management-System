import type { Priority, TaskStatus } from "./sprint.types";

export interface TaskUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface TimerSession {
  startedAt: string;
  endedAt: string | null;
  duration: number;
}

export interface Subtask {
  _id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  estimate: number;
  trackedTime: number;
  activeTimerStart: string | null;
  timerSessions: TimerSession[];
  creator: TaskUser;
  assignee: TaskUser | null;
  task: string;
  project: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  estimate: number;
  trackedTime: number;
  creator: TaskUser;
  assignees: TaskUser[];
  sprintId?: string | null;
  projectId: string;
  isInBacklog: boolean;
  order: number;
  subtasks: Subtask[];
  labels?: string[];
  // UI only
  isExpanded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  sprintId: string;
  projectId: string;
  priority?: Priority;
  assigneeIds?: string[];
  description?: string;
}

export interface CreateBacklogTaskPayload {
  title: string;
  projectId: string;
  description?: string;
  isInBacklog: boolean;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: Priority;
  assigneeIds?: string[] | null;
  status?: TaskStatus;
  labels?: string[];
  projectId?: string;
}

export interface CreateSubtaskPayload {
  title: string;
  taskId: string;
  projectId: string;
  priority?: Priority;
  estimate?: number;
  assigneeId?: string | null;
}

export interface UpdateSubtaskPayload {
  title?: string;
  priority?: Priority;
  estimate?: number;
  assigneeId?: string | null;
  status?: TaskStatus;
  projectId?: string;
}
