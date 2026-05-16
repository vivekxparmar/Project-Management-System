const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLES } = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.DEVELOPER,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: String,
      expiresAt: Date,
    },
    resetPasswordOTP: {
      code: String,
      expiresAt: Date,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    projects: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        role: {
          type: String,
          enum: Object.values(USER_ROLES),
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    notificationPreferences: {
      type: {
        emailNotifications: { type: Boolean, default: true },
        inAppNotifications: { type: Boolean, default: true },
        types: {
          type: Map,
          of: Boolean,
          default: {},
        },
      },
      default: {
        emailNotifications: true,
        inAppNotifications: true,
        types: {},
      },
    },

    lastReadAt: {
      type: Map,
      of: Date,
      default: () => new Map(),
    },
  },
  {
    timestamps: true,
  },
);

// Hash password method
userSchema.methods.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
  return this.password;
};

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const { generateOTP } = require("../utils/helpers");
  const otp = generateOTP();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  return otp;
};

// Generate reset password OTP
userSchema.methods.generateResetOTP = function () {
  const { generateOTP } = require("../utils/helpers");
  const otp = generateOTP();
  this.resetPasswordOTP = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  return otp;
};

module.exports = mongoose.model("User", userSchema);
