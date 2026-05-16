const mongoose = require("mongoose");
const { BUG_STATUS, PRIORITIES } = require("../utils/constants");
const Counter = require("./Counter");

const bugSchema = new mongoose.Schema(
  {
    bugNumber: {
      type: String,
    },
    title: {
      type: String,
      required: [true, "Bug title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(BUG_STATUS),
      default: BUG_STATUS.OPEN,
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITIES),
      default: PRIORITIES.P3,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attachments: [
      {
        url: String,
        publicId: String,
        fileType: String,
        fileName: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate bug number before saving
bugSchema.pre("save", async function () {
  if (!this.bugNumber) {
    const counter = await Counter.findOneAndUpdate(
      {
        projectId: this.projectId,
        name: "bug",
      },
      {
        $inc: { seq: 1 },
      },
      {
        returnDocument: "after",
        upsert: true,
      },
    );

    this.bugNumber = `BUG-${String(counter.seq).padStart(4, "0")}`;
  }
});

// Indexes
bugSchema.index({ projectId: 1 });
bugSchema.index({ assignee: 1 });
bugSchema.index({ status: 1 });
bugSchema.index({ projectId: 1, bugNumber: 1 }, { unique: true });

module.exports = mongoose.model("Bug", bugSchema);
