import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { REFRESH_TTL_DAYS } from "../models/refresh-session.model.js";

/**
 * TokenService - Quản lý việc cấp phát và xác thực Token, cấu hình Cookie
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tạo Access Token (JWT 15m, mang sid = id phiên thiết bị), Refresh Token (mã ngẫu nhiên, hạn 15 ngày từ lần dùng cuối)
 *   - Kiểm tra hạn dùng của Refresh Token và cấu hình cookie an toàn
 */
class TokenService {
  static JWT_ALGORITHM = "HS256";
  static JWT_ISSUER = process.env.JWT_ISSUER || "whosfree-api";
  static JWT_AUDIENCE = process.env.JWT_AUDIENCE || "whosfree-client";

  static ACCESS_TOKEN_EXPIRES = "15m"; // 15 phút
  static ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 phút tính theo ms

  static REFRESH_TOKEN_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000; // 15 ngày từ lần dùng cuối
  static REFRESH_TOKEN_MAX_AGE = this.REFRESH_TOKEN_TTL_MS; // cookie gia hạn lại mỗi lần làm mới

  static RESET_TOKEN_EXPIRES = "15m";

  /**
   * Tạo JWT access token ngắn hạn (15 phút). sessionId (sid) gắn token với phiên thiết bị trong refresh_sessions,
   * để khi phiên bị thay (thiết bị cùng loại đăng nhập) hoặc đăng xuất thì access token cũng hết hiệu lực.
   */
  static generateAccessToken(user, sessionId) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role || "member",
        token_type: "access",
        ...(sessionId && { sid: sessionId }),
      },
      process.env.JWT_SECRET,
      {
        algorithm: this.JWT_ALGORITHM,
        expiresIn: this.ACCESS_TOKEN_EXPIRES,
        issuer: this.JWT_ISSUER,
        audience: this.JWT_AUDIENCE,
      }
    );
  }

  /** Verify an application access token with one strict claim/algorithm policy. */
  static verifyAccessToken(token) {
    if (!process.env.JWT_SECRET) {
      throw AppError.internal("Lỗi cấu hình máy chủ", "JWT_SECRET_MISSING");
    }
    if (!token) {
      throw AppError.unauthorized("Không tìm thấy access token", "MISSING_ACCESS_TOKEN");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: [this.JWT_ALGORITHM],
        issuer: this.JWT_ISSUER,
        audience: this.JWT_AUDIENCE,
      });
    } catch {
      throw AppError.unauthorized("Access token không hợp lệ hoặc đã hết hạn", "INVALID_ACCESS_TOKEN");
    }

    if (
      typeof decoded === "string" ||
      decoded.token_type !== "access" ||
      decoded.purpose === "password_reset" ||
      typeof decoded.sub !== "string" ||
      decoded.sub.length === 0
    ) {
      throw AppError.unauthorized("Token không đúng mục đích sử dụng", "INVALID_TOKEN_TYPE");
    }

    return decoded;
  }

  /**
   * Tạo chuỗi Refresh Token ngẫu nhiên cryptographically secure, không trùng lặp (không dùng JWT)
   */
  static generateRefreshToken() {
    const uuid = crypto.randomUUID();
    const entropy = crypto.randomBytes(32).toString("hex");
    return `rt_${uuid}_${entropy}`;
  }

  /**
   * Refresh token đã quá hạn chưa (15 ngày không dùng)
   * @param {string|Date} lastUsedAt - lần cuối phiên được tạo/làm mới (refresh_sessions.last_used_at)
   * @returns {boolean}
   */
  static isRefreshTokenExpired(lastUsedAt) {
    if (!lastUsedAt) return true;
    const lastUsed = new Date(lastUsedAt).getTime();
    if (Number.isNaN(lastUsed)) return true;
    return Date.now() - lastUsed > this.REFRESH_TOKEN_TTL_MS;
  }

  /**
   * Tạo token dùng một lần để đặt lại mật khẩu (One-Time Reset Token)
   */
  static generateResetToken(email) {
    return jwt.sign(
      {
        sub: (email || "").toLowerCase(),
        purpose: "password_reset",
        jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET,
      {
        algorithm: this.JWT_ALGORITHM,
        expiresIn: this.RESET_TOKEN_EXPIRES,
        issuer: this.JWT_ISSUER,
        audience: this.JWT_AUDIENCE,
      }
    );
  }

  /**
   * Xác thực Reset Token đặt lại mật khẩu
   */
  static verifyResetToken(resetToken, expectedEmail) {
    if (!resetToken) {
      throw AppError.badRequest("Thiếu token xác thực đặt lại mật khẩu", "MISSING_RESET_TOKEN");
    }

    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET, {
        algorithms: [this.JWT_ALGORITHM],
        issuer: this.JWT_ISSUER,
        audience: this.JWT_AUDIENCE,
      });
      if (
        decoded.purpose !== "password_reset" ||
        decoded.sub !== (expectedEmail || "").toLowerCase()
      ) {
        throw new Error();
      }
      return decoded;
    } catch {
      throw AppError.badRequest(
        "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
        "INVALID_RESET_TOKEN"
      );
    }
  }

  /**
   * Cấu hình Cookie an toàn
   */
  static cookieOptions(maxAgeMs) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // FE gọi BE qua rewrite /api/* của Vercel nên cookie là first-party; "none" (cross-site)
      // bị Safari/iOS chặn và làm mất refresh token.
      sameSite: "lax",
      maxAge: maxAgeMs,
      path: "/",
    };
  }

  /**
   * Thiết lập Auth Cookies an toàn (HttpOnly) trên Express Response
   * Lưu cả access_token và refresh_token vào Cookie của trình duyệt.
   */
  static setAuthCookies(res, accessToken, refreshToken) {
    if (accessToken) {
      res.cookie(
        "access_token",
        accessToken,
        this.cookieOptions(this.ACCESS_TOKEN_MAX_AGE)
      );
    }
    if (refreshToken) {
      res.cookie(
        "refresh_token",
        refreshToken,
        this.cookieOptions(this.REFRESH_TOKEN_MAX_AGE)
      );
    }
  }

  /**
   * Xóa Auth Cookies khi đăng xuất
   */
  static clearAuthCookies(res) {
    const clearOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    };
    res.clearCookie("access_token", clearOpts);
    res.clearCookie("refresh_token", clearOpts);
  }
}

export default TokenService;
