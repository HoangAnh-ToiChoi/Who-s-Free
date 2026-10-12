import { Router } from "express";
import sessionController from "../controllers/session.controller.js";

const router = Router();

router.get("/", sessionController.getSessions);
router.get("/:id", sessionController.getSessionById);
router.post("/", sessionController.createSession);
router.delete("/:id", sessionController.deleteSession);

export default router;
