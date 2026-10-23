import crypto from "node:crypto";
import { query } from "../configs/db.config.js";
import { isUuid } from "../utils/uuid.js";
import AppError from "../utils/AppError.js";
import UserModel from "./user.model.js";

class TokenModel {
  // In-memory store for test environments. Max size prevents unbounded memory growth.
  static _inMemoryTokens = new Map();

  static #MAX_CACHE_SIZE = 500;
  // Must match TokenService.REFRESH_TOKEN_TTL_MS
  static #TOKEN_TTL_MS = 5 * 24 * 60 * 60 * 1000;

  static #isTokenExpired(record) {
    if (!record?.createdAt) return true;
    return Date.now() - new Date(record.createdAt).getTime() > this.#TOKEN_TTL_MS;
  }

  static #pruneTokenCache() {
    if (this._inMemoryTokens.size < this.#MAX_CACHE_SIZE) return;
    const iter = this._inMemoryTokens.keys();
    for (let i = 0; i < 50; i++) {
      const key = iter.next().value;
      if (key !== undefined) this._inMemoryTokens.delete(key);
    }
  }

  static hashToken(token) {
    if (!token) return null;
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static async updateRefreshToken(userId, refreshToken) {
    if (!userId) return null;
    const now = new Date();
    const tokenHash = this.hashToken(refreshToken);

    this.#pruneTokenCache();
    this._inMemoryTokens.set(userId, { refreshToken, tokenHash, createdAt: now });

    if (!isUuid(userId)) return null;
    if (process.env.NODE_ENV === "test") return null;

    const sql = `
      UPDATE public.users
      SET refresh_token = $2, refresh_token_created_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await query(sql, [userId, tokenHash]);
    return rows?.[0] ?? null;
  }

  /**
   * Rotate Refresh Token via Compare-and-Swap (CAS):
   * Only updates when the stored hash matches the old token — prevents replay attacks.
   */
  static async rotateRefreshToken(userId, oldRefreshToken, newRefreshToken) {
    if (!userId || !oldRefreshToken || !newRefreshToken) return null;
    const oldHash = this.hashToken(oldRefreshToken);
    const newHash = this.hashToken(newRefreshToken);
    const now = new Date();

    if (isUuid(userId)) {
      if (process.env.NODE_ENV !== "test") {
        const sql = `
          UPDATE public.users
          SET refresh_token = $3, refresh_token_created_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND refresh_token = $2
          RETURNING *;
        `;
        const { rows } = await query(sql, [userId, oldHash, newHash]);
        if (rows?.[0]) {
          this._inMemoryTokens.set(userId, { refreshToken: newRefreshToken, tokenHash: newHash, createdAt: now });
          return rows[0];
        }
        return null;
      }
    }

    // In-memory path for test environments
    if (this._inMemoryTokens.has(userId)) {
      const record = this._inMemoryTokens.get(userId);
      if (record.refreshToken === oldRefreshToken || record.tokenHash === oldHash) {
        this._inMemoryTokens.set(userId, { refreshToken: newRefreshToken, tokenHash: newHash, createdAt: now });
        return await UserModel.findById(userId);
      }
    }

    return null;
  }

  static async findByRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const tokenHash = this.hashToken(refreshToken);

    // Check in-memory first — return the record even if expired so the service
    // layer can distinguish EXPIRED vs INVALID and return the correct error code.
    for (const [userId, record] of this._inMemoryTokens.entries()) {
      if (record.refreshToken === refreshToken || record.tokenHash === tokenHash) {
        const user = await UserModel.findById(userId);
        if (user) {
          return {
            ...user,
            refresh_token: record.tokenHash,
            refresh_token_created_at: record.createdAt,
          };
        }
      }
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const { rows } = await query(
        "SELECT id, email, full_name, avatar_url, refresh_token, refresh_token_created_at, created_at FROM public.users WHERE refresh_token = $1 LIMIT 1;",
        [tokenHash]
      );
      if (rows?.length) return rows[0];
    } catch (error) {
      console.warn("Lỗi truy vấn user theo refresh_token:", error.message);
    }

    return null;
  }

  /** Evict stale entries from the token cache. Call periodically or at startup. */
  static pruneExpiredTokenCache() {
    for (const [userId, record] of this._inMemoryTokens.entries()) {
      if (this.#isTokenExpired(record)) this._inMemoryTokens.delete(userId);
    }
  }

  static async clearRefreshToken(userId) {
    if (!userId) return;
    this._inMemoryTokens.delete(userId);

    if (!isUuid(userId) || process.env.NODE_ENV === "test") return;

    try {
      await query(
        "UPDATE public.users SET refresh_token = NULL, refresh_token_created_at = NULL, updated_at = NOW() WHERE id = $1;",
        [userId]
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "test") throw AppError.internal("Lỗi thu hồi phiên đăng nhập", "DATABASE_ERROR");
      console.warn("Lỗi xóa refresh_token trong database:", error.message);
    }
  }
}

export default TokenModel;
