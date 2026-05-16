const express = require("express");
const router = express.Router();
const {
  addResource,
  getResourcesByProject,
  getResource,
  updateResource,
  deleteResource,
  uploadResourceFile,
  getResourceStats,
} = require("../../controllers/resourceController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

// All resource routes require authentication
router.use(protect);

// File upload endpoint
router.post("/upload", uploadResourceFile);

// Resource CRUD
router.route("/").post(checkProjectPermission("addResource"), addResource);

router.get(
  "/project/:projectId",
  checkProjectPermission("viewResources"),
  getResourcesByProject,
);
router.get(
  "/stats/:projectId",
  checkProjectPermission("viewResources"),
  getResourceStats,
);
router.get("/:id", checkProjectPermission("viewResources"), getResource);

router
  .route("/:id")
  .put(checkProjectPermission("addResource"), updateResource)
  .delete(checkProjectPermission("addResource"), deleteResource);

module.exports = router;
