import { normalizeEmail, sendAuthRequest } from "./authRequest";

/** Nhập mã 6 số: đúng thì BE xác thực email và trả phiên đăng nhập (refresh token qua cookie). */
export function verifyEmailCode({ email, otp }) {
  return sendAuthRequest("/auth/verify-email", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ email: normalizeEmail(email), otp: String(otp).trim() }),
  });
}

/** Gửi lại mã. Lỗi 429 mang details.retryAfterSeconds. */
export function resendVerificationEmail(email) {
  return sendAuthRequest("/auth/verify-email/resend", {
    method: "POST",
    body: JSON.stringify({ email: normalizeEmail(email) }),
  });
}
