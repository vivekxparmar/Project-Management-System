const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  reportBug,
  getBugsByProject,
  getBug,
  updateBug,
  deleteBug,
  addAttachment,
  removeAttachment,
} = require("../../controllers/bugController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

// Use memory storage to avoid disk writing issues
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

router.use(protect);

router.route("/").post(checkProjectPermission("reportBug"), reportBug);

router
  .route("/project/:projectId")
  .get(checkProjectPermission("viewResources"), getBugsByProject);

router
  .route("/:id")
  .get(checkProjectPermission("viewResources"), getBug)
  .put(checkProjectPermission("reportBug"), updateBug)
  .delete(checkProjectPermission("deleteBug"), deleteBug);

// Attachments route with multer error handling
router.post(
  "/:id/attachments",
  (req, res, next) => {
    upload.array("images", 5)(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      console.log("Files received:", req.files?.length || 0);
      next();
    });
  },
  checkProjectPermission("reportBug"),
  addAttachment,
);

router.delete(
  "/:bugId/attachments/:attachmentId",
  checkProjectPermission("reportBug"),
  removeAttachment,
);

module.exports = router;
