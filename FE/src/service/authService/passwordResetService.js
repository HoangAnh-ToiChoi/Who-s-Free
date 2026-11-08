import { normalizeEmail, sendAuthRequest } from "./authRequest";

/**
 * Tạo và gửi mã OTP 6 số để khôi phục mật khẩu
 * @param {string} email
 */
export async function createPasswordResetOtp(email) {
  const res = await sendAuthRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: normalizeEmail(email) }),
  });

  return res?.otp || null;
}

/**
 * Xác thực mã OTP 6 số
 * @param {{ email: string, otp: string }} payload
 */
export async function verifyOtp({ email, otp }) {
  const res = await sendAuthRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email: normalizeEmail(email), otp: String(otp).trim() }),
  });

  return res?.resetToken;
}

/**
 * Đặt lại mật khẩu mới
 * @param {{ email: string, resetToken: string, password: string, confirmPassword: string }} payload
 */
export async function resetPassword({ email, resetToken, password, confirmPassword }) {
  const res = await sendAuthRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(email),
      resetToken,
      password,
      confirmPassword,
    }),
  });

  return res?.message || "SUCCESS";
}
