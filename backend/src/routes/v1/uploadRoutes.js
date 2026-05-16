const express = require("express");
const router = express.Router();
const {
  uploadFile,
  deleteFile,
} = require("../../controllers/uploadController");
const { protect } = require("../../middleware/authMiddleware");

router.use(protect);

router.post("/", uploadFile);
router.delete("/:publicId", deleteFile);

module.exports = router;
