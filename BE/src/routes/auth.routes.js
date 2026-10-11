import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();
const authController = new AuthController();

/**
 * Auth Routes — /api/auth/*
 *
 * PUBLIC  (không cần token):
 *   POST   /api/auth/register          → Đăng ký tài khoản mới
 *   POST   /api/auth/login             → Đăng nhập email/password
 *   GET    /api/auth/google            → Bắt đầu Google OAuth flow
 *   GET    /api/auth/google/callback   → Google OAuth callback
 *   POST   /api/auth/refresh           → Làm mới access token
 *   POST   /api/auth/logout            → Đăng xuất
 *
 * PROTECTED (phải có token):
 *   GET    /api/auth/me                → Lấy thông tin user hiện tại
 */

// ─── Public Routes ───────────────────────────────────────────────────────────
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/google", authController.googleOAuth);
router.get("/google/callback", authController.googleCallback);
router.post("/google/session", authController.googleSession);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Recovery Flow (Quên mật khẩu qua OTP 6 số)
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);

// ─── Protected Routes ────────────────────────────────────────────────────────
router.get("/me", AuthMiddleware.authenticate, authController.getMe);

export default router;
