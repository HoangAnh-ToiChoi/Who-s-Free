import jwt from "jsonwebtoken";
import ApiResponse from "../utils/ApiResponse.js";
import UserModel from "../models/user.model.js";

/**
 * AuthMiddleware - Xác thực JWT Token trên mọi request được bảo vệ.
 *
 * Luồng xác thực:
 *   1. Đọc token từ Authorization header (Bearer <token>) HOẶC cookie "access_token"
 *   2. Thử verify signature + expiry bằng JWT_SECRET nội bộ
 *   3. Nếu không khớp (ví dụ token từ Supabase OAuth), fallback xác thực qua Supabase Auth SDK
 *   4. Gắn payload đã giải mã vào req.user để các controller downstream sử dụng
 *   5. Nếu không có/hết hạn/sai token → trả 401 Unauthorized ngay lập tức
 */
class AuthMiddleware {
  /**
   * Middleware bảo vệ route — phải đăng nhập mới dùng được.
   */
  static async authenticate(req, res, next) {
    try {
      // Ưu tiên đọc từ Authorization header, fallback sang cookie
      const authHeader = req.headers["authorization"];
      const cookieToken = req.cookies?.access_token;

      const token =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : cookieToken;

      if (!token) {
        return res
          .status(401)
          .json(
            ApiResponse.error(
              "Không tìm thấy token xác thực",
              "Unauthorized — Vui lòng đăng nhập"
            )
          );
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("❌ CRITICAL: JWT_SECRET chưa được cấu hình trong .env!");
        return res
          .status(500)
          .json(ApiResponse.error("Lỗi cấu hình máy chủ", "Internal Server Error"));
      }

      // 1. Thử verify với JWT_SECRET nội bộ của hệ thống
      try {
        const decoded = jwt.verify(token, secret);
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role || "user",
          iat: decoded.iat,
          exp: decoded.exp,
        };
        return next();
      } catch (jwtErr) {
        // 2. Fallback: Nếu không khớp chữ ký nội bộ, kiểm tra xem có phải Token từ Supabase OAuth không
        try {
          const authUser = await UserModel.getUserFromToken(token);
          if (authUser) {
            req.user = {
              id: authUser.id,
              email: authUser.email,
              role: authUser.role || "user",
            };
            return next();
          }
        } catch {
          // Token không hợp lệ ở cả 2 nơi
        }

        if (jwtErr.name === "TokenExpiredError") {
          return res
            .status(401)
            .json(ApiResponse.error("Token đã hết hạn — vui lòng đăng nhập lại", "Token Expired"));
        }

        return res
          .status(401)
          .json(ApiResponse.error("Token không hợp lệ", "Invalid Token"));
      }
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json(
            ApiResponse.error(
              "Token đã hết hạn — vui lòng đăng nhập lại",
              "Token Expired"
            )
          );
      }

      if (err.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json(ApiResponse.error("Token không hợp lệ", "Invalid Token"));
      }

      return res
        .status(500)
        .json(ApiResponse.error(err.message, "Internal Server Error"));
    }
  }

  /**
   * Middleware tùy chọn — không bắt buộc đăng nhập.
   * Nếu có token hợp lệ thì gắn req.user, không có thì bỏ qua (vẫn cho qua).
   * Dùng cho các route public nhưng cần biết user là ai nếu họ đã đăng nhập.
   */
  static optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      const cookieToken = req.cookies?.access_token;
      const token =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : cookieToken;

      if (!token) return next();

      const secret = process.env.JWT_SECRET;
      if (!secret) return next();

      const decoded = jwt.verify(token, secret);
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role || "user",
      };

      return next();
    } catch {
      // Token lỗi → bỏ qua, vẫn cho tiếp tục như anonymous
      return next();
    }
  }
}

export default AuthMiddleware;
