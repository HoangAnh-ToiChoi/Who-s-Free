import ApiResponse from "../utils/ApiResponse.js";
import AppError from "../utils/AppError.js";
import TokenService from "../services/token.service.js";
import AuthSessionService from "../services/auth-session.service.js";

/** Shared Bearer-token parsing and verification for protected and optional auth. */
class AuthMiddleware {
  static getBearerToken(req) {
    const authorization = req.headers?.authorization;
    if (typeof authorization !== "string") return null;

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
  }

  static sendAuthError(res, error) {
    const statusCode = error.statusCode || 401;
    const errorCode = error.errorCode || "INVALID_ACCESS_TOKEN";
    return res
      .status(statusCode)
      .json(ApiResponse.error(errorCode, error.message || "Token không hợp lệ"));
  }

  static setRequestUser(req, decoded) {
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || "user",
      sessionId: decoded.sid,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  /**
   * Xác thực token + phiên thiết bị còn sống (chưa bị thiết bị cùng loại thay, chưa đăng xuất).
   * Token không có sid chỉ còn là token cấp trước khi có phiên theo thiết bị — tự hết hạn trong 15 phút.
   */
  static async verify(token) {
    const decoded = TokenService.verifyAccessToken(token);
    if (decoded.sid && !(await AuthSessionService.isActive(decoded.sid))) {
      throw AppError.unauthorized(
        "Phiên đăng nhập đã kết thúc vì tài khoản vừa đăng nhập trên một thiết bị khác cùng loại",
        "SESSION_REVOKED"
      );
    }
    return decoded;
  }

  /** Protected routes require a valid internal Bearer access token. */
  static authenticate = async (req, res, next) => {
    const token = AuthMiddleware.getBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("MISSING_ACCESS_TOKEN", "Vui lòng đăng nhập"));
    }

    let decoded;
    try {
      decoded = await AuthMiddleware.verify(token);
    } catch (error) {
      if (error.statusCode >= 500 || !error.statusCode) return next(error);
      return AuthMiddleware.sendAuthError(res, error);
    }
    AuthMiddleware.setRequestUser(req, decoded);
    return next();
  };

  /**
   * Optional auth allows anonymous requests only when no Authorization header
   * is provided. A supplied malformed/invalid token is rejected consistently.
   */
  static optionalAuth = async (req, res, next) => {
    const authorization = req.headers?.authorization;
    if (!authorization) return next();

    const token = AuthMiddleware.getBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("INVALID_AUTHORIZATION_HEADER", "Authorization header không hợp lệ"));
    }

    let decoded;
    try {
      decoded = await AuthMiddleware.verify(token);
    } catch (error) {
      if (error.statusCode >= 500 || !error.statusCode) return next(error);
      return AuthMiddleware.sendAuthError(res, error);
    }
    AuthMiddleware.setRequestUser(req, decoded);
    return next();
  };
}

export default AuthMiddleware;
