import { Router } from "express";
import sessionController from "../controllers/session.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Session Routes — /api/sessions/*
 *
 * Authorization theo AUTH_REFACTOR_PLAN §74:
 *   - Read operations (GET): public — ai cũng có thể đọc session để nhập lịch rảnh
 *   - Write operations (POST, DELETE): phải xác thực — chỉ thành viên đã đăng nhập mới được ghi
 */

// ─── Public (không cần xác thực) ─────────────────────────────────────────────
router.get("/", sessionController.getSessions);
router.get("/:id", sessionController.getSessionById);

// ─── Protected (phải có Bearer access token) ─────────────────────────────────
router.post("/", AuthMiddleware.authenticate, sessionController.createSession);
router.delete("/:id", AuthMiddleware.authenticate, sessionController.deleteSession);

export default router;
