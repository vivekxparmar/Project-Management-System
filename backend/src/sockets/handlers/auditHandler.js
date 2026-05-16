const AuditLog = require("../../models/AuditLog");
const AuditService = require("../../services/auditService");

const setupAuditHandlers = (io, socket) => {
  const userId = socket.user._id.toString();

  // Handle real-time audit feed request
  socket.on("audit:subscribe", async (data) => {
    const { projectId, filter } = data;

    if (!projectId) {
      socket.emit("audit:error", { message: "Project ID required" });
      return;
    }

    // Join project audit room
    socket.join(`audit:${projectId}`);

    // Send initial recent logs
    const query = { projectId };
    if (filter?.action) query.action = filter.action;
    if (filter?.entityType) query.entityType = filter.entityType;

    const recentLogs = await AuditLog.find(query)
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    socket.emit("audit:init", {
      logs: recentLogs,
      projectId,
      timestamp: new Date(),
    });

    console.log(
      `User ${socket.user.name} subscribed to audit feed for project ${projectId}`,
    );
  });

  // Handle unsubscribe
  socket.on("audit:unsubscribe", (data) => {
    const { projectId } = data;
    socket.leave(`audit:${projectId}`);
    console.log(
      `User ${socket.user.name} unsubscribed from audit feed for project ${projectId}`,
    );
  });

  // Handle request for more logs
  socket.on("audit:loadMore", async (data) => {
    const { projectId, before, limit = 50, filter } = data;

    const query = { projectId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    if (filter?.action) query.action = filter.action;
    if (filter?.entityType) query.entityType = filter.entityType;

    const logs = await AuditLog.find(query)
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(limit);

    socket.emit("audit:moreLogs", {
      logs,
      projectId,
      hasMore: logs.length === limit,
      timestamp: new Date(),
    });
  });
};

module.exports = { setupAuditHandlers };
