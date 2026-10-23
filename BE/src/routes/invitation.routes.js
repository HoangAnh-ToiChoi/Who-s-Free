import { Router } from "express";
import GroupInvitationController from "../controllers/group-invitation.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();
const groupInvitationController = new GroupInvitationController();

/**
 * GET /api/invitations/:token - Xem trước thông tin lời mời (Public, an toàn)
 */
router.get("/:token", groupInvitationController.getInvitationPreview);

/**
 * POST /api/invitations/:token/accept - Chấp nhận lời mời (Bắt buộc xác thực)
 */
router.post(
  "/:token/accept",
  AuthMiddleware.authenticate,
  groupInvitationController.acceptInvitation
);

export default router;
