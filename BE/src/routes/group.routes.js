import { Router } from "express";
import GroupController from "../controllers/group.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import GroupInvitationController from "../controllers/group-invitation.controller.js";
import GroupInviteLinkController from "../controllers/group-invite-link.controller.js";
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  createInvitationSchema,
} from "../validations/group.validation.js";

const router = Router();
const groupController = new GroupController();
const groupInvitationController = new GroupInvitationController();
const groupInviteLinkController = new GroupInviteLinkController();

// Toàn bộ API Group & Members bắt buộc người dùng phải xác thực (Bearer Token)
router.use(AuthMiddleware.authenticate);

/**
 * Group Endpoints — /api/groups/*
 */
router.post("/", validate(createGroupSchema), groupController.createGroup);
router.get("/", groupController.getUserGroups);
router.get("/:id", groupController.getGroupDetail);
router.patch("/:id", validate(updateGroupSchema), groupController.updateGroup);
router.delete("/:id", groupController.deleteGroup);

/**
 * Member Endpoints — /api/groups/:id/members/*
 */
router.get("/:id/members", groupController.getMembers);
router.post("/:id/members", validate(addMemberSchema), groupController.addMember);
router.delete("/:id/members/:userId", groupController.removeMember);

/**
 * Group Invitation Endpoints — /api/groups/:id/invitations/*
 */
router.post("/:id/invitations", validate(createInvitationSchema), groupInvitationController.createInvitation);
router.get("/:id/invitations", groupInvitationController.getPendingInvitations);
router.post("/:id/invitations/:invitationId/resend", groupInvitationController.resendInvitation);
router.delete("/:id/invitations/:invitationId", groupInvitationController.revokeInvitation);

/**
 * Group Invite Link Endpoints — /api/groups/:id/invite-link
 */
router.post("/:id/invite-link", groupInviteLinkController.generateInviteLink);
router.get("/:id/invite-link", groupInviteLinkController.getInviteLink);

export default router;
