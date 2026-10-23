import { Router } from "express";
import GroupInviteLinkController from "../controllers/group-invite-link.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();
const controller = new GroupInviteLinkController();

/**
 * Join Link Endpoints — /api/join/*
 */

// Xem trước thông tin nhóm từ link mời (Public - không cần đăng nhập)
router.get("/:token", controller.getJoinPreview);

// Tham gia nhóm qua link mời (Bắt buộc đăng nhập)
router.post("/:token", AuthMiddleware.authenticate, controller.joinGroup);

export default router;
