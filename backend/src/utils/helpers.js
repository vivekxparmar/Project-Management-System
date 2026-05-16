const crypto = require("crypto");

// Generate random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate random token
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Calculate task status from subtasks
const calculateTaskStatus = (subtasks) => {
  if (!subtasks || subtasks.length === 0) return "Todo";

  const allDone = subtasks.every((subtask) => subtask.status === "Done");
  if (allDone) return "Done";

  const anyInProgress = subtasks.some(
    (subtask) => subtask.status === "In Progress",
  );
  if (anyInProgress) return "In Progress";

  return "Todo";
};

// Calculate task estimate from subtasks
const calculateTaskEstimate = (subtasks) => {
  if (!subtasks || subtasks.length === 0) return 0;
  return subtasks.reduce((sum, subtask) => sum + (subtask.estimate || 0), 0);
};

// Calculate task tracked time from subtasks
const calculateTaskTrackedTime = (subtasks) => {
  if (!subtasks || subtasks.length === 0) return 0;
  return subtasks.reduce((sum, subtask) => sum + (subtask.trackedTime || 0), 0);
};

// Format time for display (hours to "1h 42m")
const formatTime = (hours) => {
  const hrs = Math.floor(hours);
  const mins = Math.round((hours - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

// Check if user has permission
const hasPermission = (userRole, action) => {
  const { RBAC_PERMISSIONS } = require("./constants");
  return RBAC_PERMISSIONS[userRole]?.[action] || false;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Pagination helper
const paginate = (page = 1, limit = 10) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;
  return { skip, limit: limitNum, page: pageNum };
};

module.exports = {
  generateOTP,
  generateToken,
  calculateTaskStatus,
  calculateTaskEstimate,
  calculateTaskTrackedTime,
  formatTime,
  hasPermission,
  isValidEmail,
  deepClone,
  paginate,
};
