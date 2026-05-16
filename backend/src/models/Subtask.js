const mongoose = require("mongoose");
const { TASK_STATUS, PRIORITIES } = require("../utils/constants");

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Subtask title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITIES),
      default: PRIORITIES.P3,
    },
    estimate: {
      type: Number,
      default: 1, 
    },
    trackedTime: {
      type: Number,
      default: 0, // Accumulated from timer sessions
    },
    activeTimerStart: {
      type: Date,
      default: null, // Track when the current timer started
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
subtaskSchema.index({ taskId: 1 });
subtaskSchema.index({ assignee: 1 });
subtaskSchema.index({ status: 1 });

module.exports = mongoose.model("Subtask", subtaskSchema);
