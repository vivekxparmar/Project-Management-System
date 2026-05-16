const cloudinary = require("../config/cloudinary");
const { v4: uuidv4 } = require("uuid");

const uploadFile = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const file = req.files.file;
    const { folder = "pms" } = req.body;

    if (file.size > 10 * 1024 * 1024) {
      return res
        .status(400)
        .json({ success: false, message: "File size cannot exceed 10MB" });
    }

    // Determine resource type
    let resourceType = "raw";
    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    }

    // Get original file extension
    const originalName = file.name;
    const ext = originalName.split(".").pop();
    const uniqueName = `${uuidv4()}.${ext}`; // ← preserve extension

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder,
      resource_type: resourceType,
      public_id: `${folder}/${uniqueName}`,
      // For raw files, tell Cloudinary to serve with correct content-type
      ...(resourceType === "raw" && {
        format: ext, // preserve format
      }),
      transformation:
        resourceType === "image" ? [{ width: 1200, crop: "limit" }] : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        type: resourceType,
        fileName: originalName, // send back original name
        size: file.size,
        mimeType: file.mimetype, // send back mime type
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
};

// @desc    Delete file from Cloudinary
// @route   DELETE /api/v1/upload/:publicId
// @access  Private
const deleteFile = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const projectId = req.body.projectId;

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "File not found",
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
};
