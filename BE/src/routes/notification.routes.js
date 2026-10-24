import { Router } from "express";
import notificationController from "../controllers/notification.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", AuthMiddleware.authenticate, notificationController.list);
router.post("/read", AuthMiddleware.authenticate, notificationController.markAllRead);

export default router;
