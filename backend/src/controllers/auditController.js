const AuditLog = require("../models/AuditLog");
const Project = require("../models/Project");
const User = require("../models/User");
const { AUDIT_ACTIONS } = require("../utils/constants");

// @desc    Get audit logs for a project
// @route   GET /api/v1/audit/:projectId
// @access  Private
const getAuditLogs = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    let query = { projectId };

    // Apply filters
    if (action) {
      query.action = action;
    }

    if (entityType) {
      query.entityType = entityType;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { entityName: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { changes: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("user", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query),
    ]);

    // Get unique users and actions for filter options
    const uniqueUsers = await AuditLog.distinct("user", { projectId });
    const uniqueActions = await AuditLog.distinct("action", { projectId });
    const uniqueEntityTypes = await AuditLog.distinct("entityType", {
      projectId,
    });

    // Get user details for unique users
    const users = await User.find({ _id: { $in: uniqueUsers } }).select(
      "name email avatar",
    );

    res.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        actions: uniqueActions,
        entityTypes: uniqueEntityTypes,
        users: users,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log summary/stats
// @route   GET /api/v1/audit/:projectId/summary
// @access  Private
const getAuditSummary = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = {
      projectId,
      createdAt: { $gte: startDate },
    };

    // Get total actions by type
    const actionsByType = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get total actions by entity
    const actionsByEntity = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: "$entityType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get top active users
    const topUsers = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
          userName: { $first: "$userName" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get daily activity
    const dailyActivity = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Get total counts
    const totalActions = await AuditLog.countDocuments(query);
    const uniqueUsers = await AuditLog.distinct("user", query).length;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalActions,
          uniqueUsers,
          timeRange: `${days} days`,
        },
        actionsByType,
        actionsByEntity,
        topUsers,
        dailyActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's activity log across all projects
// @route   GET /api/v1/audit/user/my-activity
// @access  Private
const getMyActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      startDate,
      endDate,
    } = req.query;

    let query = { user: userId };

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      AuditLog.find(query)
        .populate("projectId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export audit logs
// @route   GET /api/v1/audit/:projectId/export
// @access  Private
const exportAuditLogs = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      format = "json",
      startDate,
      endDate,
      action,
      entityType,
    } = req.query;

    let query = { projectId };

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const auditLogs = await AuditLog.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    if (format === "csv") {
      // Convert to CSV
      const csvHeaders = [
        "Timestamp",
        "User",
        "Action",
        "Entity Type",
        "Entity Name",
        "Changes",
        "IP Address",
      ];
      const csvRows = auditLogs.map((log) => [
        log.createdAt.toISOString(),
        log.userName,
        log.action,
        log.entityType,
        log.entityName,
        JSON.stringify(log.changes),
        log.ipAddress || "N/A",
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=audit-logs-${Date.now()}.csv`,
      );
      return res.status(200).send(csvContent);
    } else {
      // Default JSON format
      res.status(200).json({
        success: true,
        count: auditLogs.length,
        data: auditLogs,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log by ID
// @route   GET /api/v1/audit/log/:id
// @access  Private
const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findById(id)
      .populate("user", "name email avatar")
      .populate("projectId", "name");

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revert action (for certain actions like delete/update)
// @route   POST /api/v1/audit/:id/revert
// @access  Private (Owner/Admin only)
const revertAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const auditLog = await AuditLog.findById(id);
    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    // Check if action is revertible
    const revertibleActions = ["delete", "update", "status_change", "move"];
    if (!revertibleActions.includes(auditLog.action)) {
      return res.status(400).json({
        success: false,
        message: "This action cannot be reverted",
      });
    }

    // Log the revert action
    await AuditLog.create({
      projectId: auditLog.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "audit",
      entityId: auditLog._id,
      entityName: "Action Revert",
      changes: { revertedActionId: id, reason },
    });

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${auditLog.projectId}`).emit("audit:actionReverted", {
      auditLogId: id,
      revertedBy: req.user.name,
      reason,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Action reverted successfully",
      data: { revertedActionId: id, reason },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log timeline
// @route   GET /api/v1/audit/:projectId/timeline
// @access  Private
const getAuditTimeline = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { entityId, entityType } = req.query;

    if (!entityId || !entityType) {
      return res.status(400).json({
        success: false,
        message: "Entity ID and Entity Type are required",
      });
    }

    const timeline = await AuditLog.find({
      projectId,
      entityId,
      entityType,
    })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getAuditSummary,
  getMyActivity,
  exportAuditLogs,
  getAuditLogById,
  revertAction,
  getAuditTimeline,
};
