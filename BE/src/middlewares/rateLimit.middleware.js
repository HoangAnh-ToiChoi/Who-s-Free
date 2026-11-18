import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import ApiResponse from "../utils/ApiResponse.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const rateLimitMessage = (errorCode, message) =>
    ApiResponse.error(errorCode, message);

const skipInTest = () => process.env.NODE_ENV === "test";

// Limiter chạy trước validate nên body có thể thiếu email hoặc sai kiểu.
export const normalizeEmail = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

/**
 * Key theo IP + tài khoản (email, hoặc token lời mời ở route invitation): cả lớp dùng
 * chung Wi-Fi (chung IP công cộng) không khoá lẫn nhau, nhưng dò mật khẩu một tài khoản
 * vẫn bị chặn. Không có định danh → rơi về key theo IP.
 */
export const authAccountKey = (req) => {
    const ipKey = ipKeyGenerator(req.ip);
    const identity = normalizeEmail(req.body?.email) || req.params?.token || "";
    return identity ? `${ipKey}|${identity}` : ipKey;
};

export const AUTH_IP_LIMIT = 100;
export const AUTH_ACCOUNT_LIMIT = 10;

const authIpRateLimit = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: AUTH_IP_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều yêu cầu từ mạng này. Vui lòng thử lại sau 15 phút.",
    ),
    skip: skipInTest,
});

const authAccountRateLimit = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: AUTH_ACCOUNT_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: authAccountKey,
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều lần thử cho tài khoản này. Vui lòng thử lại sau 15 phút.",
    ),
    skip: skipInTest,
});

// Express nhận mảng middleware, nên route vẫn dùng `authRateLimit` như cũ.
export const authRateLimit = [authIpRateLimit, authAccountRateLimit];

export const forgotPasswordRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều yêu cầu gửi OTP. Vui lòng thử lại sau 1 giờ.",
    ),
    skip: skipInTest,
});

export const availabilityWriteRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
    message: rateLimitMessage(
        "TOO_MANY_REQUESTS",
        "Quá nhiều yêu cầu cập nhật lịch. Vui lòng thử lại sau.",
    ),
    skip: skipInTest,
});
