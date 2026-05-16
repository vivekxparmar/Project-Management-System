const TimerSession = require("../models/TimerSession");
const Subtask = require("../models/Subtask");
const Task = require("../models/Task");
const { calculateTaskTrackedTime } = require("../utils/helpers");

// @desc    Start timer for a subtask
// @route   POST /api/v1/timer/start
// @access  Private
const startTimer = async (req, res, next) => {
  try {
    const { subtaskId } = req.body;

    if (!subtaskId) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    // Check if subtask exists
    const subtask = await Subtask.findById(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found",
      });
    }

    // Check if there's already an active timer
    const existingTimer = await TimerSession.findOne({
      subtaskId,
      isActive: true,
    });

    if (existingTimer) {
      return res.status(400).json({
        success: false,
        message: "Timer already running for this subtask",
      });
    }

    // Create new timer session
    const timer = await TimerSession.create({
      subtaskId,
      userId: req.user._id,
      startTime: new Date(),
      isActive: true,
    });

    // Update subtask status to "In Progress" if it's not already
    if (subtask.status !== "In Progress") {
      subtask.status = "In Progress";
      subtask.activeTimerStart = timer.startTime;
      await subtask.save();

      // Update parent task status
      const allSubtasks = await Subtask.find({ taskId: subtask.taskId });
      const task = await Task.findById(subtask.taskId);
      if (task) {
        task.status = calculateTaskStatus(allSubtasks);
        await task.save();
      }
    } else {
      subtask.activeTimerStart = timer.startTime;
      await subtask.save();
    }

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${subtask.projectId}`).emit("timer:started", {
      subtaskId,
      startTime: timer.startTime,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: timer,
      message: "Timer started successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stop timer for a subtask
// @route   POST /api/v1/timer/stop
// @access  Private
const stopTimer = async (req, res, next) => {
  try {
    const { subtaskId } = req.body;

    if (!subtaskId) {
      return res.status(400).json({
        success: false,
        message: "Subtask ID is required",
      });
    }

    // Find active timer
    const activeTimer = await TimerSession.findOne({
      subtaskId,
      isActive: true,
    });

    if (!activeTimer) {
      return res.status(404).json({
        success: false,
        message: "No active timer found for this subtask",
      });
    }

    // Calculate duration in seconds
    const endTime = new Date();
    const duration = Math.floor((endTime - activeTimer.startTime) / 1000);

    // Stop the timer
    activeTimer.endTime = endTime;
    activeTimer.duration = duration;
    activeTimer.isActive = false;
    await activeTimer.save();

    // Update subtask tracked time
    const allSessions = await TimerSession.find({ subtaskId });
    const totalTrackedTime = allSessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0,
    );

    const subtask = await Subtask.findById(subtaskId);
    subtask.trackedTime = totalTrackedTime;
    subtask.activeTimerStart = null;
    await subtask.save();

    // Update parent task tracked time
    const allSubtasks = await Subtask.find({ taskId: subtask.taskId });
    const task = await Task.findById(subtask.taskId);
    if (task) {
      task.trackedTime = calculateTaskTrackedTime(allSubtasks);
      await task.save();
    }

    // Send real-time update
    const io = req.app.get("io");
    io.to(`project:${subtask.projectId}`).emit("timer:stopped", {
      subtaskId,
      duration,
      trackedTime: totalTrackedTime,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: activeTimer,
      trackedTime: totalTrackedTime,
      message: "Timer stopped successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get timer status for a subtask
// @route   GET /api/v1/timer/status/:subtaskId
// @access  Private
const getTimerStatus = async (req, res, next) => {
  try {
    const { subtaskId } = req.params;

    const activeTimer = await TimerSession.findOne({
      subtaskId,
      isActive: true,
    });

    const subtask = await Subtask.findById(subtaskId).select(
      "trackedTime activeTimerStart",
    );

    res.status(200).json({
      success: true,
      isRunning: !!activeTimer,
      activeTimer: activeTimer || null,
      trackedTime: subtask?.trackedTime || 0,
      activeTimerStart: subtask?.activeTimerStart || null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all timer sessions for a subtask
// @route   GET /api/v1/timer/sessions/:subtaskId
// @access  Private
const getTimerSessions = async (req, res, next) => {
  try {
    const { subtaskId } = req.params;

    const sessions = await TimerSession.find({ subtaskId })
      .sort({ startTime: -1 })
      .populate("userId", "name email avatar");

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startTimer,
  stopTimer,
  getTimerStatus,
  getTimerSessions,
};
