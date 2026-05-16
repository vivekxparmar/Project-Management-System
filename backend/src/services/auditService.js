const AuditLog = require("../models/AuditLog");
const { AUDIT_ACTIONS } = require("../utils/constants");

class AuditService {
  /**
   * Log an action to audit trail
   * @param {Object} params - Audit parameters
   * @param {string} params.projectId - Project ID
   * @param {string} params.userId - User ID
   * @param {string} params.userName - User name
   * @param {string} params.userRole - User role
   * @param {string} params.action - Action type (from AUDIT_ACTIONS)
   * @param {string} params.entityType - Entity type (project, sprint, task, etc.)
   * @param {string} params.entityId - Entity ID
   * @param {string} params.entityName - Entity name
   * @param {Object} params.changes - Changes made (old and new values)
   * @param {string} params.ipAddress - IP address (optional)
   * @param {string} params.userAgent - User agent (optional)
   */
  static async log({
    projectId,
    userId,
    userName,
    userRole,
    action,
    entityType,
    entityId,
    entityName,
    changes = {},
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      const auditLog = await AuditLog.create({
        projectId,
        user: userId,
        userName,
        userRole,
        action,
        entityType,
        entityId,
        entityName,
        changes,
        ipAddress,
        userAgent,
      });

      const io = require("../server").io;
      if (io) {
        io.to(`project:${projectId}`).emit("audit:new", {
          auditLog,
          timestamp: new Date(),
        });
      }

      return auditLog;
    } catch (error) {
      console.error("Audit logging error:", error);
      return null;
    }
  }

  /**
   * Log a create action
   */
  static logCreate(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    data,
    ipAddress = null,
    userAgent = null,
  ) {
    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: AUDIT_ACTIONS.CREATE,
      entityType,
      entityId,
      entityName,
      changes: { created: data },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log an update action with before/after values
   */
  static logUpdate(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    oldData,
    newData,
    ipAddress = null,
    userAgent = null,
  ) {
    const changes = {};
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    }

    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: AUDIT_ACTIONS.UPDATE,
      entityType,
      entityId,
      entityName,
      changes,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a delete action
   */
  static logDelete(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    deletedData,
    ipAddress = null,
    userAgent = null,
  ) {
    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: AUDIT_ACTIONS.DELETE,
      entityType,
      entityId,
      entityName,
      changes: { deleted: deletedData },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a status change
   */
  static logStatusChange(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    oldStatus,
    newStatus,
    ipAddress = null,
    userAgent = null,
  ) {
    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entityType,
      entityId,
      entityName,
      changes: { status: { old: oldStatus, new: newStatus } },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log an assignment
   */
  static logAssignment(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    assignedTo,
    ipAddress = null,
    userAgent = null,
  ) {
    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: AUDIT_ACTIONS.ASSIGN,
      entityType,
      entityId,
      entityName,
      changes: { assignedTo },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a move action (task to sprint, etc.)
   */
  static logMove(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    from,
    to,
    ipAddress = null,
    userAgent = null,
  ) {
    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: AUDIT_ACTIONS.MOVE,
      entityType,
      entityId,
      entityName,
      changes: { from, to },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log a lock/unlock action
   */
  static logLock(
    projectId,
    userId,
    userName,
    userRole,
    entityType,
    entityId,
    entityName,
    isLocked,
    ipAddress = null,
    userAgent = null,
  ) {
    return this.log({
      projectId,
      userId,
      userName,
      userRole,
      action: isLocked ? AUDIT_ACTIONS.LOCK : AUDIT_ACTIONS.UNLOCK,
      entityType,
      entityId,
      entityName,
      changes: { locked: isLocked },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get audit logs for an entity
   */
  static async getEntityHistory(entityType, entityId) {
    return await AuditLog.find({
      entityType,
      entityId,
    })
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 });
  }

  /**
   * Get recent activity for a user
   */
  static async getUserActivity(userId, limit = 20) {
    return await AuditLog.find({ user: userId })
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = AuditService;
