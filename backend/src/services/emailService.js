const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Project Management System" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify Your Email - OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">© 2024 Project Management System. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send OTP email");
  }
};

// Send password reset OTP email
const sendResetPasswordEmail = async (email, otp, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Project Management System" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Password Reset Request - OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Please use the following OTP to reset your password:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">© 2024 Project Management System. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send password reset email");
  }
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Project Management System" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Welcome to Project Management System!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome ${name}! 🎉</h2>
          <p>Thank you for joining Project Management System!</p>
          <p>You can now:</p>
          <ul>
            <li>Create and manage projects</li>
            <li>Track sprints and tasks</li>
            <li>Report bugs and issues</li>
            <li>Collaborate with your team in real-time</li>
          </ul>
          <p>Get started by <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #0066cc;">logging into your dashboard</a>.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">© 2024 Project Management System. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Welcome email error:", error);
    // Don't throw, welcome email is not critical
    return false;
  }
};

// Send notification email
const sendNotificationEmail = async (
  email,
  name,
  subject,
  message,
  link = null,
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Project Management System" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${subject}</h2>
          <p>Hello ${name},</p>
          <p>${message}</p>
          ${link ? `<a href="${link}" style="display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Details</a>` : ""}
          <hr style="margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">© 2024 Project Management System. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Notification email error:", error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail,
  sendWelcomeEmail,
  sendNotificationEmail,
};
