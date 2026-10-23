import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import ApiResponse from "../utils/ApiResponse.js";

const rateLimitMessage = (errorCode, message) =>
    ApiResponse.error(errorCode, message);

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
    ),
    skip: () => process.env.NODE_ENV === "test",
});

export const forgotPasswordRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều yêu cầu gửi OTP. Vui lòng thử lại sau 1 giờ.",
    ),
    skip: () => process.env.NODE_ENV === "test",
});

export const availabilityWriteRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều yêu cầu cập nhật lịch. Vui lòng thử lại sau.",
    ),
    skip: () => process.env.NODE_ENV === "test",
});
