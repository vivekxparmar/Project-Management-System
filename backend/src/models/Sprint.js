const mongoose = require("mongoose");
const { SPRINT_STATUS } = require("../utils/constants");

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Sprint name is required"],
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SPRINT_STATUS),
      default: SPRINT_STATUS.PLANNED,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    goal: {
      type: String,
      maxlength: 500,
      default: "",
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    completedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Validate end date is after start date
sprintSchema.pre("save", function () {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    throw new Error("End date must be after start date");
  }
});

// Indexes
sprintSchema.index({ projectId: 1, status: 1 });
sprintSchema.index({ endDate: 1 });

module.exports = mongoose.model("Sprint", sprintSchema);
