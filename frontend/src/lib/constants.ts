import type { Priority, TaskStatus, SprintStatus } from "../types";
import type { BugStatus } from "../types";
import type { ProjectStatus } from "../types";

// Priority
export const PRIORITY_OPTIONS: {
  value: Priority;
  label: string;
  color: string;
}[] = [
  {
    value: "P0",
    label: "P0 Critical",
    color: "!bg-red-500/20 border-red-500 text-foreground",
  },
  {
    value: "P1",
    label: "P1 High",
    color: "!bg-orange-500/20 border-orange-500 text-foreground",
  },
  {
    value: "P2",
    label: "P2 Medium High",
    color: "!bg-yellow-400/20 border-yellow-400 text-foreground",
  },
  {
    value: "P3",
    label: "P3 Medium",
    color: "!bg-blue-400/20 border-blue-400 text-foreground",
  },
  {
    value: "P4",
    label: "P4 Low",
    color: "!bg-green-400/20 border-green-400 text-foreground",
  },
  {
    value: "P5",
    label: "P5 Lowest",
    color: "!bg-gray-400/20 border-gray-400 text-foreground",
  },
];

export const getPriorityColor = (priority: Priority) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority)?.color ?? "";

// Task Status
export const TASK_STATUS_OPTIONS: {
  value: TaskStatus;
  label: string;
  color: string;
}[] = [
  {
    value: "Todo",
    label: "Todo",
    color: "bg-gray-200 text-gray-700 text-xs font-semibold",
  },
  {
    value: "In Progress",
    label: "In Progress",
    color: "bg-blue-200 text-blue-700 text-xs font-semibold",
  },
  {
    value: "Done",
    label: "Done",
    color: "bg-green-200 text-green-700 text-xs font-semibold",
  },
];

export const getTaskStatusColor = (status: TaskStatus) =>
  TASK_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "";

// Bug Status
export const BUG_STATUS_OPTIONS: {
  value: BugStatus;
  label: string;
  color: string;
}[] = [
  { value: "Open", label: "Open", color: "bg-gray-200 text-gray-700" },
  {
    value: "In Progress",
    label: "In Progress",
    color: "bg-blue-200 text-blue-700",
  },
  {
    value: "In Review",
    label: "In Review",
    color: "bg-purple-200 text-purple-700",
  },
  { value: "Fixed", label: "Fixed", color: "bg-green-200 text-green-700" },
  { value: "Closed", label: "Closed", color: "bg-gray-100 text-gray-500" },
];

export const getBugStatusColor = (status: BugStatus) =>
  BUG_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "";

// Sprint Status
export const SPRINT_STATUS_OPTIONS: {
  value: SprintStatus;
  label: string;
  color: string;
}[] = [
  { value: "Planned", label: "Planned", color: "bg-gray-200 text-gray-700" },
  { value: "Active", label: "Active", color: "bg-blue-200 text-blue-700" },
  {
    value: "Completed",
    label: "Completed",
    color: "bg-green-200 text-green-700",
  },
];

export const getSprintStatusColor = (status: SprintStatus) =>
  SPRINT_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "";

// Project Status
export const PROJECT_STATUS_OPTIONS: {
  value: ProjectStatus;
  label: string;
  color: string;
}[] = [
  {
    value: "Not Started",
    label: "Not Started",
    color: "bg-gray-200/20 text-foreground/90 border-gray-500",
  },
  {
    value: "Active",
    label: "Active",
    color: "bg-blue-200/20 text-blue-500 border-blue-500",
  },
  {
    value: "Paused",
    label: "Paused",
    color: "bg-yellow-200/20 text-yellow-500 border-yellow-500",
  },
  {
    value: "Completed",
    label: "Completed",
    color: "bg-green-200/20 text-green-500 border-green-500",
  },
];

export const getProjectStatusColor = (status: ProjectStatus) =>
  PROJECT_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "";

// Member Roles
export const MEMBER_ROLES = [
  "Owner",
  "Admin",
  "Developer",
  "Designer",
  "Client",
] as const;

// RBAC helpers
// Returns true if role can do the action
export const canManageSprint = (role?: string) =>
  ["Owner", "Admin", "Developer"].includes(role ?? "");
export const canCreateTask = (role?: string) =>
  ["Owner", "Admin", "Developer", "Designer"].includes(role ?? "");
export const canEditTask = (role?: string) =>
  ["Owner", "Admin", "Developer", "Designer"].includes(role ?? "");
export const canDeleteTask = (role?: string) =>
  ["Owner", "Admin", "Developer"].includes(role ?? "");
export const canReportBug = (role?: string) =>
  ["Owner", "Admin", "Developer", "Designer", "Client"].includes(role ?? "");
export const canDeleteBug = (role?: string) =>
  ["Owner", "Admin"].includes(role ?? "");
export const canManageTeam = (role?: string) =>
  ["Owner", "Admin"].includes(role ?? "");
export const canChangeSettings = (role?: string) =>
  ["Owner", "Admin"].includes(role ?? "");
export const canLockSprint = (role?: string) =>
  ["Owner", "Admin"].includes(role ?? "");
export const canAddResource = (role?: string) =>
  ["Owner", "Admin", "Developer", "Designer"].includes(role ?? "");
export const canDeleteResource = (role?: string) =>
  ["Owner", "Admin"].includes(role ?? "");

// Utility
export const formatTrackedTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

export const getInitials = (name?: string): string => {
  if (!name || typeof name !== "string") {
    return "?";
  }
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
