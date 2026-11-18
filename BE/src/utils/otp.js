import crypto from "node:crypto";
import { jwtConfig } from "../configs/jwt.config.js";

/** Mã OTP 6 chữ số ngẫu nhiên an toàn. */
export const generateOtp = () => String(crypto.randomInt(100000, 1000000));

/** HMAC của mã gắn với email: DB chỉ giữ giá trị này, lộ bảng cũng không đọc ra được mã. */
export function hashOtp(email, otp) {
  const secret = jwtConfig.otpSecret;
  return crypto.createHmac("sha256", secret).update(`${email}:${String(otp).trim()}`).digest("hex");
}

/** So mã người dùng nhập với HMAC đã lưu (so sánh thời gian hằng). */
export function otpMatches(otpHash, email, otp) {
  if (!otpHash) return false;
  const expected = Buffer.from(otpHash, "hex");
  const actual = Buffer.from(hashOtp(email, String(otp ?? "").trim()), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
