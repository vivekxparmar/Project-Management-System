const express = require("express");
const router = express.Router();
const {
  addComment,
  updateComment,
  deleteComment,
  getAllBugComments,
} = require("../../controllers/commentController");
const { protect } = require("../../middleware/authMiddleware");
const { checkProjectPermission } = require("../../middleware/rbacMiddleware");

router.use(protect);

router.post("/", checkProjectPermission("reportBug"), addComment);
router.get("/bug/:bugId", getAllBugComments);
router.put("/:id", checkProjectPermission("reportBug"), updateComment);
router.delete("/:id", checkProjectPermission("reportBug"), deleteComment);

module.exports = router;
