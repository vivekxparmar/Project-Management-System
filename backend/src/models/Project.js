const mongoose = require("mongoose");
const { PROJECT_STATUS } = require("../utils/constants");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.NOT_STARTED,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["Owner", "Admin", "Developer", "Designer", "Client"],
          default: "Developer",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      defaultSprintDuration: {
        type: Number,
        default: 14, // days
      },
      defaultTaskEstimate: {
        type: Number,
        default: 1, // hours
      },
      defaultPriority: {
        type: String,
        default: "P3",
      },
      notificationPreferences: {
        emailOnTaskAssign: { type: Boolean, default: true },
        emailOnBugReport: { type: Boolean, default: true },
        emailOnSprintExpiry: { type: Boolean, default: true },
      },
      integrations: {
        github: { type: String, default: null },
        slackWebhook: { type: String, default: null },
      },
      customLabels: [
        {
          name: String,
          color: String,
        },
      ],
      permissions: {
        type: Map,
        of: Map,
        default: {},
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
projectSchema.index({ owner: 1 });
projectSchema.index({ "members.user": 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isArchived: 1, isDeleted: 1 });

module.exports = mongoose.model("Project", projectSchema);
