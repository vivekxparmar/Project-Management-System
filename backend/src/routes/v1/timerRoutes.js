const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  startTimer,
  stopTimer,
  getTimerStatus,
  getTimerSessions,
} = require("../controllers/timerController");

// All timer routes require authentication
router.use(protect);

// Timer actions
router.post("/start", startTimer);
router.post("/stop", stopTimer);
router.get("/status/:subtaskId", getTimerStatus);
router.get("/sessions/:subtaskId", getTimerSessions);

module.exports = router;
