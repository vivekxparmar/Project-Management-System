import api from "./axios";
import type {
  LoginPayload,
  RegisterPayload,
  OTPPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from "../types";

export const authService = {
  register: (data: RegisterPayload) => api.post("/auth/register", data),

  verifyOTP: (data: OTPPayload) => api.post("/auth/verify-otp", data),

  resendOTP: (email: string) => api.post("/auth/resend-otp", { email }),

  login: (data: LoginPayload) => api.post("/auth/login", data),

  forgotPassword: (data: ForgotPasswordPayload) =>
    api.post("/auth/forgot-password", data),

  verifyForgotOTP: (data: OTPPayload) =>
    api.post("/auth/verify-forgot-otp", data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post("/auth/reset-password", data),

  getMe: () => api.get("/auth/me"),

  logout: () => api.post("/auth/logout"),

  googleLogin: (googleToken: string) =>
    api.post("/auth/google", { googleToken }),
};
