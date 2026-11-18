import { Router } from "express";
import memberController from "../controllers/member.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", AuthMiddleware.authenticate, memberController.getAll);

export default router;
