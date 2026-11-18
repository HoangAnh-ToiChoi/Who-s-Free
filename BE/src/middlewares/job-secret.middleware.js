import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "../controllers/errorHandle.controller.js";
import { jobConfig } from "../configs/job.config.js";

const digest = (value) => createHash("sha256").update(String(value)).digest();

/**
 * Bảo vệ endpoint job bằng header x-job-secret (không dùng JWT: cron gọi, không có người dùng).
 * JOB_SECRET chưa cấu hình → 503 (đóng hẳn endpoint). Băm sha256 trước để timingSafeEqual luôn so hai buffer cùng độ dài.
 */
export function requireJobSecret(req, res, next) {
  const expected = jobConfig.secret;
  if (!expected) return next(new AppError("Job chưa được cấu hình", 503, "JOB_NOT_CONFIGURED"));
  const provided = req.get("x-job-secret");
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    return next(AppError.unauthorized("Job secret không hợp lệ", "INVALID_JOB_SECRET"));
  }
  next();
}
