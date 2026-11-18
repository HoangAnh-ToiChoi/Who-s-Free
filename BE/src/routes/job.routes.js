import { Router } from "express";
import jobController from "../controllers/job.controller.js";
import { requireJobSecret } from "../middlewares/job-secret.middleware.js";

const router = Router();

// Không qua AuthMiddleware: xác thực bằng x-job-secret. Danh sách job: src/jobs/*.job.js
router.post("/:name", requireJobSecret, jobController.run);

export default router;
