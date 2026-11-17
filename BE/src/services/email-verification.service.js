import crypto from "node:crypto";
import EmailVerificationModel from "../models/email-verification.model.js";
import SupabaseAuthModel from "../models/supabase-auth.model.js";
import UserModel from "../models/user.model.js";
import AuthSessionService from "./auth-session.service.js";
import EmailService from "./email.service.js";
import AppError from "../utils/AppError.js";
import { generateOtp, hashOtp, otpMatches } from "../utils/otp.js";
import { toPublicUser } from "../utils/mappers/user.mapper.js";

const TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

const normalize = (email) => String(email || "").trim().toLowerCase();
// Người dùng chỉ thấy thông báo chung; lý do thật (sai mã / hết hạn / bị khoá) chỉ nằm trong bảng + log server.
const INVALID_CODE_MESSAGE = "Mã không hợp lệ hoặc đã hết hạn. Vui lòng thử lại hoặc gửi mã mới.";
const maskEmail = (email) => String(email).replace(/^(.{2})[^@]*/, "$1***");
const logEvent = (event, fields) =>
  console.warn(`[verify-email] ${event} ${Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(" ")}`);
const invalidCode = () => AppError.badRequest(INVALID_CODE_MESSAGE, "VERIFY_CODE_INVALID");
const isConfirmed = (authUser) => Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at);

/**
 * Xác thực email cho tài khoản đăng ký bằng email + mật khẩu (OTP 6 số qua Brevo).
 * Supabase giữ cổng chặn (email_confirmed_at); bảng email_verifications là nhật ký từng lần gửi mã.
 */
class EmailVerificationService {
  static TTL_SECONDS = TTL_SECONDS;
  static MAX_ATTEMPTS = MAX_ATTEMPTS;
  static RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_SECONDS;
  static MAX_SENDS_PER_HOUR = MAX_SENDS_PER_HOUR;

  /** Số giây còn phải chờ trước khi được gửi mã mới (0 = gửi được ngay). */
  static #retryAfter({ lastSentAt, sentLastHour }, now = Date.now()) {
    if (sentLastHour >= MAX_SENDS_PER_HOUR) return 3600;
    if (!lastSentAt) return 0;
    return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - (now - lastSentAt.getTime()) / 1000));
  }

  /**
   * Gửi mã mới cho tài khoản (mã cũ còn chờ bị thay thế). Không ném lỗi khi bị giới hạn hay Brevo lỗi:
   * trả về { sent, retryAfterSeconds, failed } để luồng đăng ký / đăng nhập vẫn đưa người dùng tới màn nhập mã.
   */
  async dispatch({ userId, email }, reason, device = {}) {
    const target = normalize(email);
    const retryAfterSeconds = EmailVerificationService.#retryAfter(await EmailVerificationModel.sendStats(target));
    if (retryAfterSeconds > 0) {
      logEvent("throttled", { user: userId, email: maskEmail(target), reason, retryAfter: retryAfterSeconds });
      return { sent: false, retryAfterSeconds };
    }

    const otp = generateOtp();
    await EmailVerificationModel.supersedePending(target);
    const id = await EmailVerificationModel.create({
      userId,
      email: target,
      otpHash: hashOtp(target, otp),
      reason,
      ip: device.ip,
      userAgent: device.userAgent,
      expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
    });

    try {
      await EmailService.sendEmailVerificationOtp({ email: target, otp, expiresInMinutes: TTL_SECONDS / 60 });
    } catch (error) {
      await EmailVerificationModel.setStatus(id, "send_failed");
      logEvent("send_failed", { id, user: userId, error: JSON.stringify(error?.message || "unknown") });
      return { sent: false, failed: true, retryAfterSeconds: 0 };
    }
    return { sent: true, retryAfterSeconds: RESEND_COOLDOWN_SECONDS };
  }

  /** Thông tin gửi kèm phản hồi để FE hiện màn nhập mã. */
  static pendingPayload(email, delivery) {
    return {
      requiresVerification: true,
      email: normalize(email),
      codeSent: delivery.sent,
      sendFailed: Boolean(delivery.failed),
      expiresInSeconds: TTL_SECONDS,
      resendInSeconds: delivery.retryAfterSeconds,
    };
  }

  /**
   * Bấm "Gửi lại mã". Không tiết lộ email có tồn tại hay không: email lạ / đã xác thực vẫn trả về như đã gửi.
   */
  async resend({ email }, device) {
    const target = normalize(email);
    const authUser = await SupabaseAuthModel.findByEmail(target);
    if (!authUser || isConfirmed(authUser)) {
      return EmailVerificationService.pendingPayload(target, { sent: true, retryAfterSeconds: RESEND_COOLDOWN_SECONDS });
    }

    const delivery = await this.dispatch({ userId: authUser.id, email: target }, "resend", device);
    if (delivery.failed) {
      throw new AppError("Chưa gửi được mã, vui lòng thử lại sau ít phút.", 503, "VERIFY_SEND_FAILED");
    }
    if (!delivery.sent) {
      throw new AppError("Vui lòng chờ một chút trước khi gửi lại mã.", 429, "VERIFY_RESEND_WAIT", {
        retryAfterSeconds: delivery.retryAfterSeconds,
      });
    }
    return EmailVerificationService.pendingPayload(target, delivery);
  }

  /** Nhập mã: đúng thì xác nhận email trên Supabase, ghi verified và đăng nhập luôn. */
  async verify({ email, otp }, device) {
    const target = normalize(email);
    const record = await EmailVerificationModel.findLatestPending(target);
    if (!record) {
      logEvent("no_pending_code", { email: maskEmail(target), ip: device?.ip });
      throw invalidCode();
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      await EmailVerificationModel.setStatus(record.id, "expired");
      logEvent("expired", { id: record.id, user: record.userId });
      throw invalidCode();
    }
    if (!otpMatches(record.otpHash, target, otp)) {
      const attempts = await EmailVerificationModel.recordFailedAttempt(record.id);
      const locked = attempts >= MAX_ATTEMPTS;
      if (locked) await EmailVerificationModel.setStatus(record.id, "locked");
      logEvent(locked ? "locked" : "wrong_code", { id: record.id, user: record.userId, attempts, ip: device?.ip });
      throw invalidCode();
    }

    const authUser = await SupabaseAuthModel.updateUser(record.userId, { email_confirm: true });
    await EmailVerificationModel.setStatus(record.id, "verified");
    logEvent("verified", { id: record.id, user: record.userId });
    const user = toPublicUser(await UserModel.syncAuthUser(authUser));
    const { accessToken, refreshToken } = await AuthSessionService.issue(user, device);
    return { user, accessToken, refreshToken };
  }

  /**
   * Đăng nhập Google vào tài khoản từng tự đăng ký nhưng chưa xác thực: mật khẩu đó có thể do người lạ đặt
   * (chiếm trước email), nên thay bằng mật khẩu ngẫu nhiên và ghi nhận email đã được Google xác thực.
   */
  async secureOAuthAccount(authUser) {
    if (!authUser?.id || !(await EmailVerificationModel.isUnverifiedSignup(authUser.id))) return;
    await SupabaseAuthModel.updateUser(authUser.id, {
      password: crypto.randomBytes(32).toString("base64url"),
      email_confirm: true,
    });
    await this.#recordIndirect(authUser, "oauth");
    logEvent("secured_by_oauth", { user: authUser.id });
  }

  /** Đặt lại mật khẩu qua OTP cũng chứng minh là chủ email → xác thực luôn nếu tài khoản còn chờ. */
  async confirmAfterPasswordReset(user) {
    if (!user?.id || !(await EmailVerificationModel.isUnverifiedSignup(user.id))) return;
    await SupabaseAuthModel.updateUser(user.id, { email_confirm: true });
    await this.#recordIndirect(user, "password_reset");
  }

  async #recordIndirect(user, reason) {
    const email = normalize(user.email);
    await EmailVerificationModel.supersedePending(email);
    await EmailVerificationModel.create({ userId: user.id, email, reason, status: "verified" });
  }
}

export default EmailVerificationService;
export { isConfirmed, logEvent };
