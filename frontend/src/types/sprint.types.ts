export type SprintStatus = "Planned" | "Active" | "Completed";

export type Priority = "P0" | "P1" | "P2" | "P3" | "P4" | "P5";

export type TaskStatus = "Todo" | "In Progress" | "Done";

export interface Sprint {
  _id: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  projectId: string;
  createdBy: {
    _id: string;
    name: string;
    avatar: string;
  };
  trackedTime: number;
  activatedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintPayload {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  projectId: string;
}

export interface UpdateSprintPayload {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  projectId: string;
}
