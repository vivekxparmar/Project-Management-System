// User Roles
const USER_ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  CLIENT: "Client",
};

// Project Status
const PROJECT_STATUS = {
  NOT_STARTED: "Not Started",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
};

// Sprint Status
const SPRINT_STATUS = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

// Task Status
const TASK_STATUS = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

// Bug Status
const BUG_STATUS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  FIXED: "Fixed",
  CLOSED: "Closed",
};

// Priority Levels
const PRIORITIES = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
  P5: "P5",
};

// Notification Types
const NOTIFICATION_TYPES = {
  // Task related
  TASK_ASSIGNED: "task_assigned",
  TASK_UPDATED: "task_updated",
  TASK_DELETED: "task_deleted",
  TASK_CREATED: "task_created",
  TASK_UNASSIGNED: "task_unassigned",
  TASK_MOVED: "task_moved",
  TASK_MOVED_TO_BACKLOG: "task_moved_to_backlog",

  // Subtask related
  SUBTASK_ASSIGNED: "subtask_assigned",
  SUBTASK_UPDATED: "subtask_updated",
  SUBTASK_DELETED: "subtask_deleted",
  SUBTASK_CREATED: "subtask_created",
  SUBTASK_UNASSIGNED: "subtask_unassigned",

  // Bug related
  BUG_REPORTED: "bug_reported",
  BUG_ASSIGNED: "bug_assigned",
  BUG_UPDATED: "bug_updated",
  BUG_DELETED: "bug_deleted",
  BUG_UNASSIGNED: "bug_unassigned",

  // Sprint related
  SPRINT_CREATED: "sprint_created",
  SPRINT_UPDATED: "sprint_updated",
  SPRINT_STARTED: "sprint_started",
  SPRINT_COMPLETED: "sprint_completed",
  SPRINT_PLANNING: "sprint_planning",
  SPRINT_EXPIRED: "sprint_expired",
  SPRINT_LOCKED: "sprint_locked",
  SPRINT_UNLOCKED: "sprint_unlocked",
  SPRINT_DELETED: "sprint_deleted",

  // Project related
  PROJECT_UPDATED: "project_updated",
  PROJECT_ARCHIVED: "project_archived",
  PROJECT_STATUS_CHANGED: "project_status_changed",

  // Team related
  TEAM_MEMBER_ADDED: "team_member_added",
  TEAM_MEMBER_REMOVED: "team_member_removed",
  ROLE_CHANGED: "role_changed",

  // Resource related
  RESOURCE_ADDED: "resource_added",
  RESOURCE_DELETED: "resource_deleted",

  // Comment related
  COMMENT_ADDED: "comment_added",
  MENTION: "mention",
};

// Audit Actions
const AUDIT_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  STATUS_CHANGE: "status_change",
  ASSIGN: "assign",
  MOVE: "move",
  LOCK: "lock",
  UNLOCK: "unlock",
  ARCHIVE: "archive",
  RESTORE: "restore",
  LOGIN: "login",
  LOGOUT: "logout",
};

const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  TASK_UPDATED: "task:updated",
  TASK_CREATED: "task:created",
  TASK_DELETED: "task:deleted",
  SUBTASK_UPDATED: "subtask:updated",
  SUBTASK_CREATED: "subtask:created",
  SUBTASK_DELETED: "subtask:deleted",
  BUG_UPDATED: "bug:updated",
  BUG_CREATED: "bug:created",
  SPRINT_UPDATED: "sprint:updated",
  PROJECT_UPDATED: "project:updated",
  NOTIFICATION: "notification:new",
  CHAT_MESSAGE: "chat:message",
  USER_TYPING: "user:typing",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
};

// RBAC Permission Matrix
const RBAC_PERMISSIONS = {
  [USER_ROLES.OWNER]: {
    createProject: true,
    deleteProject: true,
    manageTeam: true,
    manageSprint: true,
    createTask: true,
    editTask: true,
    deleteTask: true,
    reportBug: true,
    deleteBug: true,
    viewResources: true,
    addResource: true,
    viewAuditLog: true,
    changeSettings: true,
    archiveProject: true,
    lockSprint: true,
  },
  [USER_ROLES.ADMIN]: {
    createProject: true,
    deleteProject: false,
    manageTeam: true,
    manageSprint: true,
    createTask: true,
    editTask: true,
    deleteTask: true,
    reportBug: true,
    deleteBug: true,
    viewResources: true,
    addResource: true,
    viewAuditLog: true,
    changeSettings: true,
    archiveProject: true,
    lockSprint: true,
  },
  [USER_ROLES.DEVELOPER]: {
    createProject: false,
    deleteProject: false,
    manageTeam: false,
    manageSprint: true,
    createTask: true,
    editTask: true,
    deleteTask: true,
    reportBug: true,
    deleteBug: false,
    viewResources: true,
    addResource: true,
    viewAuditLog: true,
    changeSettings: false,
    archiveProject: false,
    lockSprint: false,
  },
  [USER_ROLES.DESIGNER]: {
    createProject: false,
    deleteProject: false,
    manageTeam: false,
    manageSprint: false,
    createTask: true,
    editTask: true,
    deleteTask: false,
    reportBug: true,
    deleteBug: false,
    viewResources: true,
    addResource: true,
    viewAuditLog: true,
    changeSettings: false,
    archiveProject: false,
    lockSprint: false,
  },
  [USER_ROLES.CLIENT]: {
    createProject: false,
    deleteProject: false,
    manageTeam: false,
    manageSprint: false,
    createTask: false,
    editTask: false,
    deleteTask: false,
    reportBug: true,
    deleteBug: false,
    viewResources: true,
    addResource: false,
    viewAuditLog: true,
    changeSettings: false,
    archiveProject: false,
    lockSprint: false,
  },
};

module.exports = {
  USER_ROLES,
  PROJECT_STATUS,
  SPRINT_STATUS,
  TASK_STATUS,
  BUG_STATUS,
  PRIORITIES,
  NOTIFICATION_TYPES,
  AUDIT_ACTIONS,
  RBAC_PERMISSIONS,
  SOCKET_EVENTS,
};
