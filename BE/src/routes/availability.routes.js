import { Router } from "express";
import availabilityController from "../controllers/availability.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Availability Routes — /api/availabilities/*
 *
 * Authorization theo AUTH_REFACTOR_PLAN §74:
 *   - Read operations (GET): public — ai cũng có thể xem khung giờ rảnh của nhóm
 *   - Write operations (POST, PATCH): phải xác thực — chỉ thành viên đã đăng nhập mới được ghi
 */

// ─── Public (không cần xác thực) ─────────────────────────────────────────────
router.get("/", availabilityController.getAvailabilities);
router.get("/:id", availabilityController.getAvailabilityById);

// ─── Protected (phải có Bearer access token) ─────────────────────────────────
router.post("/", AuthMiddleware.authenticate, availabilityController.createAvailability);
router.patch("/:id", AuthMiddleware.authenticate, availabilityController.updateAvailability);

export default router;
