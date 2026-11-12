import { Router } from "express";
import sessionController from "../controllers/session.controller.js";
import availabilityController from "../controllers/availability.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import { availabilityWriteRateLimit } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// Session CRUD
router.get("/", AuthMiddleware.authenticate, sessionController.getSessions);
router.get("/:id", AuthMiddleware.authenticate, sessionController.getSessionById);
router.post("/", AuthMiddleware.authenticate, sessionController.createSession);
router.patch("/:id", AuthMiddleware.authenticate, sessionController.updateSession);
router.patch("/:id/note", AuthMiddleware.authenticate, sessionController.updateNote);
router.post("/:id/finalize", AuthMiddleware.authenticate, sessionController.finalizeSession);
// Trưởng nhóm mở (và gia hạn) / đóng bảng Chốt lịch: tạm khoá thành viên khác sửa lịch
router.post("/:id/finalizing", AuthMiddleware.authenticate, sessionController.startFinalizing);
router.delete("/:id/finalizing", AuthMiddleware.authenticate, sessionController.stopFinalizing);
router.post("/:id/unfinalize", AuthMiddleware.authenticate, sessionController.unfinalizeSession);
router.get("/:id/export.xlsx", AuthMiddleware.authenticate, sessionController.exportSchedule);
router.delete("/:id", AuthMiddleware.authenticate, sessionController.deleteSession);

// Availability nested under sessions
router.get("/:id/my-availability", AuthMiddleware.authenticate, availabilityController.getMyAvailability);
router.put("/:id/my-availability", AuthMiddleware.authenticate, availabilityWriteRateLimit, availabilityController.saveMyAvailability);
router.get("/:id/availabilities", AuthMiddleware.authenticate, availabilityController.getSessionAvailabilities);

export default router;
