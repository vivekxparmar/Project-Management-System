const mongoose = require("mongoose");
const { TASK_STATUS, PRIORITIES } = require("../utils/constants");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      default: "",
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
      default: 0, // Will be calculated from subtasks
    },
    trackedTime: {
      type: Number,
      default: 0, // Sum of subtask tracked time
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
    },
    isInBacklog: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    subtasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subtask",
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    labels: [
      {
        name: String,
        color: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

taskSchema.pre("save", async function () {
  if (!this.isModified("subtasks") && !this.isNew) return;

  if (!this.subtasks?.length) {
    this.assignees = [];
    return;
  }

  await this.populate("subtasks");

  this.assignees = [
    ...new Set(
      this.subtasks
        .filter((subtask) => subtask.assignee)
        .map((subtask) => subtask.assignee.toString()),
    ),
  ];
});

// Method to refresh assignees from subtasks
taskSchema.methods.refreshAssignees = async function () {
  await this.populate("subtasks");

  this.assignees = [
    ...new Set(
      this.subtasks
        .filter((subtask) => subtask.assignee)
        .map((subtask) => subtask.assignee.toString()),
    ),
  ];

  await this.save();
  return this.assignees;
};

// Indexes
taskSchema.index({ projectId: 1 });
taskSchema.index({ sprintId: 1 });
taskSchema.index({ isInBacklog: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model("Task", taskSchema);
