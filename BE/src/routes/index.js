import { Router } from "express";
import authRoutes from "./auth.routes.js";
import groupRoutes from "./group.routes.js";
import invitationRoutes from "./invitation.routes.js";
import sessionRoutes from "./session.routes.js";
import availabilityRoutes from "./availability.routes.js";
import MemberModel from "../models/member.model.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * Root Router — tập trung đăng ký tất cả sub-routes vào một chỗ.
 *
 * Convention:
 *   /api/auth/*          → authRoutes
 *   /api/groups/*        → groupRoutes
 *   /api/invitations/*   → invitationRoutes
 *   /api/sessions/*      → sessionRoutes
 *   /api/availabilities/* → availabilityRoutes
 *   /api/members         → member list
 *   /api/optimalSlots    → optimal analysis slots
 *   /api/conflictSlots   → conflict analysis slots
 */

const router = Router();

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);
router.use("/invitations", invitationRoutes);
router.use("/sessions", sessionRoutes);
router.use("/availabilities", availabilityRoutes);

router.get("/members", async (req, res) => {
  const members = await MemberModel.findAll();
  return res.json(ApiResponse.success(members, "Lấy danh sách thành viên thành công"));
});

router.get("/optimalSlots", (req, res) => {
  return res.json(ApiResponse.success([], "Lấy danh sách khung giờ tối ưu thành công"));
});

router.get("/conflictSlots", (req, res) => {
  return res.json(ApiResponse.success([], "Lấy danh sách khung giờ xung đột thành công"));
});

export default router;
