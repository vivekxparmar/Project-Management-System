const Resource = require("../models/Resource");
const Project = require("../models/Project");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");
const { AUDIT_ACTIONS, NOTIFICATION_TYPES } = require("../utils/constants");

// Add Resource
const addResource = async (req, res, next) => {
  try {
    const { name, resourceType, url, description, projectId, fileData } =
      req.body;

    const io = req.app.get("io");

    if (!name || !resourceType || !projectId) {
      return res.status(400).json({
        success: false,
        message: "Name, resourceType and projectId are required",
      });
    }

    let resourceData = {
      name,
      resourceType,
      projectId,
      uploadedBy: req.user._id,
      description: description || "",
    };

    if (resourceType === "url") {
      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL required for URL resources",
        });
      }

      resourceData.url = url;
    } else {
      if (!fileData || !fileData.url || !fileData.publicId) {
        return res.status(400).json({
          success: false,
          message: "File data required",
        });
      }

      resourceData.url = fileData.url;
      resourceData.publicId = fileData.publicId;
      resourceData.fileSize = fileData.size || 0;
      resourceData.fileType = fileData.fileType || resourceType;
    }

    const resource = await Resource.create(resourceData);

    await AuditLog.create({
      projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "resource",
      entityId: resource._id,
      entityName: resource.name,
      changes: {
        name,
        resourceType,
        description,
      },
    });

    const project = await Project.findById(projectId);

    const memberIds = project.members
      .map((m) => m.user)
      .filter((memberId) => memberId.toString() !== req.user._id.toString());

    await Notification.insertMany(
      memberIds.map((memberId) => ({
        userId: memberId,
        projectId,
        type: "resource_added",
        title: "New Resource Added",
        message: `${req.user.name} added "${name}"`,
        sender: req.user._id,
        data: {
          resourceId: resource._id,
          resourceName: name,
          resourceType,
        },
      })),
    )
      .then(async (createdNotifications) => {
        const notificationIds = createdNotifications.map(
          (notification) => notification._id,
        );

        const populatedNotifications = await Notification.find({
          _id: { $in: notificationIds },
        })
          .populate("sender", "name email avatar")
          .populate("projectId", "name");

        populatedNotifications.forEach((notification) => {
          io.to(`user:${notification.userId}`).emit(
            "notification:new",
            notification,
          );
        });
      })
      .catch((err) => console.error("Failed to create notifications:", err));

    const populatedResource = await Resource.findById(resource._id).populate(
      "uploadedBy",
      "name email avatar",
    );

    io.to(`project:${projectId}`).emit("resource:added", {
      resource: populatedResource,
      addedBy: req.user.name,
    });

    res.status(201).json({
      success: true,
      data: populatedResource,
    });
  } catch (error) {
    next(error);
  }
};

// Get Resources By Project
const getResourcesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { resourceType, search } = req.query;

    let query = { projectId };

    if (resourceType && resourceType !== "all") {
      query.resourceType = resourceType;
    }

    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    const resources = await Resource.find(query)
      .populate("uploadedBy", "name email avatar")
      .sort({ createdAt: -1 });

    const groupedResources = {
      all: resources,
      images: resources.filter((r) => r.resourceType === "image"),
      videos: resources.filter((r) => r.resourceType === "video"),
      documents: resources.filter((r) => r.resourceType === "document"),
      urls: resources.filter((r) => r.resourceType === "url"),
      audio: resources.filter((r) => r.resourceType === "audio"),
      files: resources.filter((r) => r.resourceType === "file"),
    };

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources,
      grouped: groupedResources,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Resource
const getResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id).populate(
      "uploadedBy",
      "name email avatar",
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// Update Resource
const updateResource = async (req, res, next) => {
  try {
    const { name, description, url } = req.body;

    let resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    const changes = {};

    if (name && name !== resource.name) {
      changes.name = {
        old: resource.name,
        new: name,
      };
    }

    if (description && description !== resource.description) {
      changes.description = {
        old: resource.description,
        new: description,
      };
    }

    if (url && url !== resource.url && resource.resourceType === "url") {
      changes.url = {
        old: resource.url,
        new: url,
      };
    }

    resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { name, description, url },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("uploadedBy", "name email avatar");

    await AuditLog.create({
      projectId: resource.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "resource",
      entityId: resource._id,
      entityName: resource.name,
      changes,
    });

    req.app
      .get("io")
      .to(`project:${resource.projectId}`)
      .emit("resource:updated", {
        resource,
        changes,
        updatedBy: req.user.name,
      });

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Resource
const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    const io = req.app.get("io");

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    }

    if (resource.publicId) {
      try {
        await cloudinary.uploader.destroy(resource.publicId);
      } catch (e) {
        console.error(e);
      }
    }

    // Get project members to send notifications
    const project = await Project.findById(resource.projectId);

    // Send notifications to all project members except the one deleting
    const memberIds = project.members
      .map((m) => m.user)
      .filter((memberId) => memberId.toString() !== req.user._id.toString());

    if (memberIds.length > 0) {
      await Notification.insertMany(
        memberIds.map((memberId) => ({
          userId: memberId,
          projectId: resource.projectId,
          type: NOTIFICATION_TYPES.RESOURCE_DELETED,
          title: "Resource Deleted",
          message: `${req.user.name} deleted resource "${resource.name}"`,
          sender: req.user._id,
          data: {
            resourceId: resource._id,
            resourceName: resource.name,
            resourceType: resource.resourceType,
            deletedBy: req.user.name,
          },
        })),
      )
        .then(async (createdNotifications) => {
          const notificationIds = createdNotifications.map(
            (notification) => notification._id,
          );

          const populatedNotifications = await Notification.find({
            _id: { $in: notificationIds },
          })
            .populate("sender", "name email avatar")
            .populate("projectId", "name");

          populatedNotifications.forEach((notification) => {
            io.to(`user:${notification.userId}`).emit(
              "notification:new",
              notification,
            );
          });
        })
        .catch((err) => console.error("Failed to create notifications:", err));
    }

    await AuditLog.create({
      projectId: resource.projectId,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "resource",
      entityId: resource._id,
      entityName: resource.name,
      changes: { deleted: true },
    });

    await resource.deleteOne();

    io.to(`project:${resource.projectId}`).emit("resource:deleted", {
      resourceId: req.params.id,
      resourceName: resource.name,
      deletedBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Upload File
const uploadResourceFile = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const file = req.files.file;

    const { folder = "resources" } = req.body;

    if (file.size > 20 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Max 20MB allowed",
      });
    }

    let cloudinaryResourceType = "raw";
    let detectedResourceType = "file";

    if (file.mimetype.startsWith("image/")) {
      cloudinaryResourceType = "image";
      detectedResourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      cloudinaryResourceType = "video";
      detectedResourceType = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      detectedResourceType = "audio";
    } else if (
      file.mimetype.includes("pdf") ||
      file.mimetype.includes("document") ||
      file.mimetype.includes("sheet")
    ) {
      detectedResourceType = "document";
    }

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder,
      resource_type: cloudinaryResourceType,
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: detectedResourceType,
        fileName: file.name,
        size: file.size,
        fileType: file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Stats
const getResourceStats = async (req, res, next) => {
  try {
    const resources = await Resource.find({
      projectId: req.params.projectId,
    });

    const stats = {
      total: resources.length,

      byType: {
        image: resources.filter((r) => r.resourceType === "image").length,
        video: resources.filter((r) => r.resourceType === "video").length,
        audio: resources.filter((r) => r.resourceType === "audio").length,
        document: resources.filter((r) => r.resourceType === "document").length,
        url: resources.filter((r) => r.resourceType === "url").length,
        file: resources.filter((r) => r.resourceType === "file").length,
      },

      totalSize: resources.reduce((sum, r) => sum + (r.fileSize || 0), 0),

      recentResources: resources
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map((r) => ({
          id: r._id,
          name: r.name,
          resourceType: r.resourceType,
          createdAt: r.createdAt,
          uploadedBy: r.uploadedBy,
        })),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addResource,
  getResourcesByProject,
  getResource,
  updateResource,
  deleteResource,
  uploadResourceFile,
  getResourceStats,
};
