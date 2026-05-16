const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

// @desc    Update user profile (name, avatar)
// @route   PUT /api/v1/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatePayload = {};

    if (name && name !== user.name) {
      updatePayload.name = name;
    }

    // Handle avatar upload using express-fileupload
    if (req.files && req.files.avatar) {
      const file = req.files.avatar;

      // Validate image type
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Avatar must be an image file",
        });
      }

      // Validate size (max 2MB for avatars)
      if (file.size > 2 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Avatar size cannot exceed 2MB",
        });
      }

      // Delete old avatar from Cloudinary if exists
      if (user.avatar) {
        try {
          // Extract public_id from URL
          const urlParts = user.avatar.split("/");
          const publicId = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Failed to delete old avatar:", err.message);
        }
      }

      // Upload new avatar
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "avatars",
        resource_type: "image",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
      });

      updatePayload.avatar = result.secure_url;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes provided",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { returnDocument: "after", runValidators: true },
    ).select("-password -otp -resetPasswordOTP");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/v1/users/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await user.hashPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateProfile, changePassword };
