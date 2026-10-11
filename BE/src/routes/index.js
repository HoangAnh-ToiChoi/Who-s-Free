import { Router } from "express";
import authRoutes from "./auth.routes.js";

/**
 * Root Router — tập trung đăng ký tất cả sub-routes vào một chỗ.
 *
 * Convention:
 *   /api/auth/*     → authRoutes
 *   /api/groups/*   → groupRoutes  (sẽ thêm sau)
 *   /api/sessions/* → sessionRoutes (sẽ thêm sau)
 *   /api/members/*  → memberRoutes  (sẽ thêm sau)
 */

const router = Router();

router.use("/auth", authRoutes);

// TODO: đăng ký thêm các route khác khi implement
// router.use("/groups", groupRoutes);
// router.use("/sessions", sessionRoutes);
// router.use("/members", memberRoutes);

export default router;
