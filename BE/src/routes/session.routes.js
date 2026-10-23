import { Router } from "express";
import sessionController from "../controllers/session.controller.js";
import availabilityController from "../controllers/availability.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import { availabilityWriteRateLimit } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// Session CRUD
router.get("/", sessionController.getSessions);
router.get("/:id", sessionController.getSessionById);
router.post("/", AuthMiddleware.authenticate, sessionController.createSession);
router.post("/:id/finalize", AuthMiddleware.authenticate, sessionController.finalizeSession);
router.post("/:id/unfinalize", AuthMiddleware.authenticate, sessionController.unfinalizeSession);
router.get("/:id/export.xlsx", AuthMiddleware.authenticate, sessionController.exportSchedule);
router.delete("/:id", AuthMiddleware.authenticate, sessionController.deleteSession);

// Availability nested under sessions
router.get("/:id/my-availability", AuthMiddleware.authenticate, availabilityController.getMyAvailability);
router.put("/:id/my-availability", AuthMiddleware.authenticate, availabilityWriteRateLimit, availabilityController.saveMyAvailability);
router.get("/:id/availabilities", AuthMiddleware.authenticate, availabilityController.getSessionAvailabilities);

export default router;
