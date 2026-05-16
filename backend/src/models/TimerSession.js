const mongoose = require("mongoose");

const timerSessionSchema = new mongoose.Schema(
  {
    subtaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subtask",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in hours
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

timerSessionSchema.pre("save", function () {
  try {
    if (this.endTime && this.isActive) {
      this.duration = (this.endTime - this.startTime) / (1000 * 60 * 60);
      this.isActive = false;
    }
  } catch (error) {
    throw error;
  }
});

// Indexes
timerSessionSchema.index({ subtaskId: 1, isActive: 1 });
timerSessionSchema.index({ userId: 1 });

module.exports = mongoose.model("TimerSession", timerSessionSchema);
