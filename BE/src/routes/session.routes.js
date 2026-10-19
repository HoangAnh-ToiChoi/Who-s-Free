import { Router } from "express";
import sessionController from "../controllers/session.controller.js";
import availabilityController from "../controllers/availability.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// Session CRUD
router.get("/", sessionController.getSessions);
router.get("/:id", sessionController.getSessionById);
router.post("/", AuthMiddleware.authenticate, sessionController.createSession);
router.delete("/:id", AuthMiddleware.authenticate, sessionController.deleteSession);

// Availability nested under sessions
router.get("/:id/my-availability", AuthMiddleware.authenticate, availabilityController.getMyAvailability);
router.put("/:id/my-availability", AuthMiddleware.authenticate, availabilityController.saveMyAvailability);
router.get("/:id/availabilities", availabilityController.getSessionAvailabilities);

export default router;
