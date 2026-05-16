const express = require("express");
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  resendOTP,
  getMe,
  logout,
} = require("../../controllers/authController");
const { protect } = require("../../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors,
} = require("../../middleware/validationMiddleware");

// Public routes
router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/verify-otp", validateOTP, handleValidationErrors, verifyOTP);
router.post("/login", validateLogin, handleValidationErrors, login);
// router.post("/google", googleLogin);
router.post(
  "/forgot-password",
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword,
);
router.post(
  "/reset-password",
  validateResetPassword,
  handleValidationErrors,
  resetPassword,
);
router.post("/resend-otp", resendOTP);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

module.exports = router;
