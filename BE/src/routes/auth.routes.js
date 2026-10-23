import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { authRateLimit, forgotPasswordRateLimit } from "../middlewares/rateLimit.middleware.js";
import {
  registerSchema,
  loginSchema,
  googleSessionSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "../validations/auth.validation.js";

const router = Router();
const authController = new AuthController();

/**
 * Auth Routes — /api/auth/*
 *
 * PUBLIC  (không cần token):
 *   POST   /api/auth/register          → Đăng ký tài khoản mới (Zod validated)
 *   POST   /api/auth/login             → Đăng nhập email/password (Zod validated)
 *   GET    /api/auth/google            → Bắt đầu Google OAuth flow
 *   GET    /api/auth/google/callback   → Google OAuth callback
 *   POST   /api/auth/google/session    → Đồng bộ Google OAuth session (Zod validated)
 *   POST   /api/auth/refresh           → Làm mới access token
 *   POST   /api/auth/logout            → Đăng xuất
 *
 * RECOVERY FLOW:
 *   POST   /api/auth/forgot-password   → Gửi OTP (Zod validated)
 *   POST   /api/auth/verify-otp        → Xác thực OTP 6 số (Zod validated)
 *   POST   /api/auth/reset-password    → Đổi mật khẩu mới (Zod validated)
 *
 * PROTECTED (phải có token):
 *   GET    /api/auth/me                → Lấy thông tin user hiện tại
 */

// ─── Public Routes ───────────────────────────────────────────────────────────
router.post("/register", authRateLimit, validate(registerSchema), authController.register);
router.post("/login", authRateLimit, validate(loginSchema), authController.login);
router.get("/google", authController.googleOAuth);
router.get("/google/callback", authController.googleCallback);
router.post("/google/session", authRateLimit, validate(googleSessionSchema), authController.googleSession);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Recovery Flow (Quên mật khẩu qua OTP 6 số)
router.post("/forgot-password", forgotPasswordRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/verify-otp", authRateLimit, validate(verifyOtpSchema), authController.verifyOtp);
router.post("/reset-password", authRateLimit, validate(resetPasswordSchema), authController.resetPassword);

// ─── Protected Routes ────────────────────────────────────────────────────────
router.get("/me", AuthMiddleware.authenticate, authController.getMe);

export default router;
