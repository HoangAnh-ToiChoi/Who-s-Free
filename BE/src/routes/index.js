import { Router } from "express";
import authRoutes from "./auth.routes.js";
import groupRoutes from "./group.routes.js";
import invitationRoutes from "./invitation.routes.js";
import sessionRoutes from "./session.routes.js";
import availabilityRoutes from "./availability.routes.js";
import MemberModel from "../models/member.model.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);
router.use("/invitations", invitationRoutes);
router.use("/sessions", sessionRoutes);
router.use("/availabilities", availabilityRoutes);

router.get(
  "/members",
  AuthMiddleware.authenticate,
  asyncHandler(async (req, res) => {
    const members = await MemberModel.findAll();
    return res.json(ApiResponse.success(members, "Lấy danh sách thành viên thành công"));
  }),
);

export default router;
