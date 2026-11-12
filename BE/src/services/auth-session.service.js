import RefreshSessionModel from "../models/refresh-session.model.js";
import TokenService from "./token.service.js";
import AppError from "../utils/AppError.js";
import { toPublicUser } from "../utils/mappers/user.mapper.js";

// Nhớ kết quả "phiên còn sống" để middleware không phải hỏi DB ở mọi request.
// Phiên bị thay/thu hồi ngay trên server này thì xoá khỏi cache luôn (bị đá ngay);
// trường hợp khác (vd nhiều instance) thiết bị cũ bị đá chậm nhất sau ACTIVE_CACHE_MS.
const ACTIVE_CACHE_MS = 60 * 1000;
const ACTIVE_CACHE_MAX = 5000;
const activeCache = new Map(); // sessionId -> hết hạn cache (ms)

function forget(sessionIds) {
  for (const id of [sessionIds].flat()) if (id) activeCache.delete(id);
}

/**
 * AuthSessionService - Phiên đăng nhập theo thiết bị: cấp, làm mới (RTR), thu hồi, kiểm tra còn sống.
 * Access token mang `sid` = id phiên trong refresh_sessions.
 */
class AuthSessionService {
  /**
   * Cấp phiên mới cho thiết bị; thiết bị cùng loại đang đăng nhập (nếu có) bị thay thế.
   * @param {object} publicUser
   * @param {{ kind: string, userAgent: string }} device
   */
  static async issue(publicUser, device) {
    const refreshToken = TokenService.generateRefreshToken();
    const [{ id, replacedId }] = await Promise.all([
      RefreshSessionModel.upsertForDevice(publicUser.id, device, refreshToken),
      RefreshSessionModel.deleteExpiredForUser(publicUser.id),
    ]);
    forget(replacedId);
    return { accessToken: TokenService.generateAccessToken(publicUser, id), refreshToken };
  }

  /** Làm mới: kiểm tra hạn 15 ngày từ lần dùng cuối, rồi đổi token (một token chỉ dùng được một lần). */
  static async refresh(refreshToken) {
    if (!refreshToken) throw AppError.unauthorized("Thiếu Refresh Token", "MISSING_REFRESH_TOKEN");

    const record = await RefreshSessionModel.findByToken(refreshToken);
    if (!record) {
      throw AppError.unauthorized("Refresh Token không hợp lệ hoặc đã hết hạn", "INVALID_REFRESH_TOKEN");
    }
    if (TokenService.isRefreshTokenExpired(record.last_used_at)) {
      forget(await RefreshSessionModel.deleteById(record.session_id));
      throw AppError.unauthorized("Refresh Token đã hết hạn", "REFRESH_TOKEN_EXPIRED");
    }

    const newRefreshToken = TokenService.generateRefreshToken();
    if (!(await RefreshSessionModel.rotate(record.session_id, refreshToken, newRefreshToken))) {
      throw AppError.unauthorized("Refresh Token không hợp lệ hoặc đã được sử dụng", "INVALID_REFRESH_TOKEN");
    }

    const user = toPublicUser(record);
    return {
      accessToken: TokenService.generateAccessToken(user, record.session_id),
      refreshToken: newRefreshToken,
      user,
    };
  }

  /** Đăng xuất thiết bị đang dùng (theo refresh token trong cookie). */
  static async revoke(refreshToken) {
    if (!refreshToken) return;
    forget(await RefreshSessionModel.deleteByToken(refreshToken));
  }

  /** Đăng xuất mọi thiết bị của người dùng. */
  static async revokeAll(userId) {
    if (!userId) return;
    forget(await RefreshSessionModel.deleteAllForUser(userId));
  }

  /** Phiên còn tồn tại không (đã bị thay bởi thiết bị cùng loại / đăng xuất thì false). */
  static async isActive(sessionId) {
    const now = Date.now();
    if ((activeCache.get(sessionId) ?? 0) > now) return true;

    const alive = await RefreshSessionModel.exists(sessionId);
    if (alive) {
      if (activeCache.size >= ACTIVE_CACHE_MAX) activeCache.clear();
      activeCache.set(sessionId, now + ACTIVE_CACHE_MS);
    } else {
      activeCache.delete(sessionId);
    }
    return alive;
  }
}

export default AuthSessionService;
