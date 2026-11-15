import { Router } from "express";
import jobController from "../controllers/job.controller.js";
import { requireJobSecret } from "../middlewares/job-secret.middleware.js";

const router = Router();

// Không qua AuthMiddleware: xác thực bằng x-job-secret
router.post("/session-deadlines", requireJobSecret, jobController.runSessionDeadlines);

export default router;
