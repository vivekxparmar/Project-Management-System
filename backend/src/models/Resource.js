const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Resource name is required"],
      trim: true,
    },

    resourceType: {
      type: String,
      enum: ["url", "image", "video", "audio", "document", "file"],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      default: null,
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    fileType: {
      type: String,
      default: null,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
resourceSchema.index({ projectId: 1 });
resourceSchema.index({ resourceType: 1 });

module.exports = mongoose.model("Resource", resourceSchema);
