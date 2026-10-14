import ApiResponse from "../utils/ApiResponse.js";
import TokenService from "../services/token.service.js";

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
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  /** Protected routes require a valid internal Bearer access token. */
  static authenticate = (req, res, next) => {
    const token = AuthMiddleware.getBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("MISSING_ACCESS_TOKEN", "Vui lòng đăng nhập"));
    }

    try {
      const decoded = TokenService.verifyAccessToken(token);
      AuthMiddleware.setRequestUser(req, decoded);
      return next();
    } catch (error) {
      return AuthMiddleware.sendAuthError(res, error);
    }
  };

  /**
   * Optional auth allows anonymous requests only when no Authorization header
   * is provided. A supplied malformed/invalid token is rejected consistently.
   */
  static optionalAuth = (req, res, next) => {
    const authorization = req.headers?.authorization;
    if (!authorization) return next();

    const token = AuthMiddleware.getBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json(ApiResponse.error("INVALID_AUTHORIZATION_HEADER", "Authorization header không hợp lệ"));
    }

    try {
      const decoded = TokenService.verifyAccessToken(token);
      AuthMiddleware.setRequestUser(req, decoded);
      return next();
    } catch (error) {
      return AuthMiddleware.sendAuthError(res, error);
    }
  };
}

export default AuthMiddleware;
