const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  seq: {
    type: Number,
    default: 0,
  },
});

// One counter per project + type
counterSchema.index({ projectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);
