import { Router } from "express";
import GroupInvitationController from "../controllers/group-invitation.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { authRateLimit } from "../middlewares/rateLimit.middleware.js";
import { inviteRegisterSchema } from "../validations/auth.validation.js";

const router = Router();
const groupInvitationController = new GroupInvitationController();

/**
 * GET /api/invitations/:token - Xem trước thông tin lời mời (Public, an toàn)
 */
router.get("/:token", groupInvitationController.getInvitationPreview);

/**
 * GET /api/invitations/:token/account - Email được mời đã có tài khoản chưa (cần token hợp lệ, có giới hạn tần suất)
 */
router.get("/:token/account", authRateLimit, groupInvitationController.getAccountStatus);

/**
 * POST /api/invitations/:token/register - Tạo tài khoản cho email được mời rồi đăng nhập luôn
 */
router.post(
  "/:token/register",
  authRateLimit,
  validate(inviteRegisterSchema),
  groupInvitationController.registerViaInvitation
);

/**
 * POST /api/invitations/:token/accept - Chấp nhận lời mời (Bắt buộc xác thực)
 */
router.post(
  "/:token/accept",
  AuthMiddleware.authenticate,
  groupInvitationController.acceptInvitation
);

export default router;
