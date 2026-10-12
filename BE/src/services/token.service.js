import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

/**
 * TokenService - Quản lý việc cấp phát và xác thực Token, cấu hình Cookie
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Tạo Access Token, Refresh Token, Reset Password Token
 *   - Xác thực token và xử lý cookie auth
 */
class TokenService {
  static ACCESS_TOKEN_EXPIRES = "7d";
  static REFRESH_TOKEN_EXPIRES = "30d";
  static RESET_TOKEN_EXPIRES = "15m";

  static ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  static REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

  /**
   * Tạo JWT access token
   */
  static generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role || "member",
      },
      process.env.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRES }
    );
  }

  /**
   * Tạo JWT refresh token
   */
  static generateRefreshToken(user) {
    return jwt.sign(
      { sub: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES }
    );
  }

  /**
   * Tạo token dùng một lần để đặt lại mật khẩu (One-Time Reset Token)
   */
  static generateResetToken(email) {
    return jwt.sign(
      { sub: (email || "").toLowerCase(), purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: this.RESET_TOKEN_EXPIRES }
    );
  }

  /**
   * Xác thực và giải mã Refresh Token
   */
  static verifyRefreshToken(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized("Không tìm thấy Refresh Token", "MISSING_REFRESH_TOKEN");
    }

    try {
      return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw AppError.unauthorized(
        "Refresh Token không hợp lệ hoặc đã hết hạn",
        "INVALID_REFRESH_TOKEN"
      );
    }
  }

  /**
   * Xác thực Reset Token đặt lại mật khẩu
   */
  static verifyResetToken(resetToken, expectedEmail) {
    if (!resetToken) {
      throw AppError.badRequest("Thiếu token xác thực đặt lại mật khẩu", "MISSING_RESET_TOKEN");
    }

    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
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
      sameSite: "lax",
      maxAge: maxAgeMs,
    };
  }

  /**
   * Thiết lập Auth Cookies trên Express Response
   */
  static setAuthCookies(res, accessToken, refreshToken) {
    res.cookie(
      "access_token",
      accessToken,
      this.cookieOptions(this.ACCESS_TOKEN_MAX_AGE)
    );
    res.cookie(
      "refresh_token",
      refreshToken,
      this.cookieOptions(this.REFRESH_TOKEN_MAX_AGE)
    );
  }

  /**
   * Xóa Auth Cookies khi đăng xuất
   */
  static clearAuthCookies(res) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
  }
}

export default TokenService;
