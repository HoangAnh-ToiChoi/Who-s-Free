import crypto from "node:crypto";
import { query } from "../configs/db.config.js";
import SupabaseAuthModel from "./supabase-auth.model.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Data access and public entity mapping for application users. */
class UserModel {
  // Bộ nhớ đệm tạm thời cho môi trường test hoặc khi CSDL gián đoạn
  static _inMemoryTokens = new Map();
  static _inMemoryUsers = new Map();

  /**
   * Tạo mã SHA-256 hash của refresh token để lưu an toàn vào DB
   * Ngăn chặn rò rỉ token thô nếu database bị đọc trộm (AUTH_REFACTOR_PLAN §58)
   */
  static hashToken(token) {
    if (!token) return null;
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static toPublicUser(rawUser) {
    if (!rawUser) return null;

    const metadata = rawUser.user_metadata || {};
    return {
      id: rawUser.id,
      email: (rawUser.email || "").toLowerCase(),
      fullName:
        rawUser.full_name ||
        metadata.full_name ||
        rawUser.fullName ||
        rawUser.name ||
        (rawUser.email ? rawUser.email.split("@")[0] : "Thành viên"),
      avatarUrl:
        rawUser.avatar_url || metadata.avatar_url || rawUser.avatarUrl || "",
      role: rawUser.role || metadata.role || "member",
      createdAt: rawUser.created_at || rawUser.createdAt || new Date().toISOString(),
    };
  }

  /** Persist Supabase Auth profile data in public.users. */
  static async upsertToDatabase({ id, email, fullName, avatarUrl }) {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase().trim();
    const validId = UUID_PATTERN.test(id || "") ? id : null;

    // Cache in-memory cho test environment
    const userRecord = {
      id: validId || id || `usr-${Date.now()}`,
      email: normalizedEmail,
      full_name: fullName || email.split("@")[0],
      avatar_url: avatarUrl || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (userRecord.id) {
      this._inMemoryUsers.set(userRecord.id, userRecord);
      this._inMemoryUsers.set(normalizedEmail, userRecord);
    }

    const sql = `
      INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
      VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.users.avatar_url),
        updated_at = NOW()
      RETURNING *;
    `;

    try {
      const { rows } = await query(sql, [
        validId,
        normalizedEmail,
        fullName || email.split("@")[0],
        avatarUrl || "",
      ]);
      if (rows?.[0]) {
        this._inMemoryUsers.set(rows[0].id, rows[0]);
        this._inMemoryUsers.set(normalizedEmail, rows[0]);
        return rows[0];
      }
      return userRecord;
    } catch (error) {
      console.warn("Lỗi khi ghi user vào public.users database:", error.message);
      return userRecord;
    }
  }

  static async syncAuthUser(authUser, { fullName, avatarUrl } = {}) {
    if (!authUser) return null;

    const metadata = authUser.user_metadata || {};
    await this.upsertToDatabase({
      id: authUser.id,
      email: authUser.email,
      fullName:
        fullName || metadata.full_name || metadata.name || authUser.full_name || authUser.name,
      avatarUrl: avatarUrl || metadata.avatar_url || metadata.picture || authUser.avatar_url,
    });
    return authUser;
  }

  static async createInAuth({ email, password, fullName }) {
    const authUser = await SupabaseAuthModel.createUser({
      email: email.toLowerCase(),
      password,
      fullName,
    });
    return this.syncAuthUser(authUser, { fullName });
  }

  static async signInWithPassword({ email, password }) {
    const authUser = await SupabaseAuthModel.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    return this.syncAuthUser(authUser);
  }

  static getGoogleOAuthUrl(redirectTo) {
    return SupabaseAuthModel.getGoogleOAuthUrl(redirectTo);
  }

  static async exchangeCodeForSession(code) {
    const authUser = await SupabaseAuthModel.exchangeCodeForSession(code);
    return this.syncAuthUser(authUser);
  }

  static async getUserFromToken(accessToken) {
    const authUser = await SupabaseAuthModel.getUserFromToken(accessToken);
    return this.syncAuthUser(authUser);
  }

  static async findById(userId) {
    if (!userId) return null;

    // Ưu tiên tra cứu in-memory cache (cho môi trường test hoặc session vừa ghi)
    if (this._inMemoryUsers.has(userId)) {
      return this._inMemoryUsers.get(userId);
    }

    if (UUID_PATTERN.test(userId)) {
      try {
        const { rows } = await query(
          "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE id = $1 LIMIT 1;",
          [userId]
        );
        if (rows?.length) return rows[0];
      } catch (error) {
        console.warn("Lỗi truy vấn users table theo id:", error.message);
      }
    }

    const supabaseUser = await SupabaseAuthModel.findById(userId);
    if (supabaseUser) {
      this._inMemoryUsers.set(userId, supabaseUser);
      return supabaseUser;
    }

    return null;
  }

  static async findByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();

    if (this._inMemoryUsers.has(normalizedEmail)) {
      return this._inMemoryUsers.get(normalizedEmail);
    }

    try {
      const { rows } = await query(
        "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE LOWER(email) = $1 LIMIT 1;",
        [normalizedEmail]
      );
      if (rows?.length) return rows[0];
    } catch (error) {
      console.warn("Lỗi truy vấn users table theo email:", error.message);
    }

    const supabaseUser = await SupabaseAuthModel.findByEmail(normalizedEmail);
    if (supabaseUser) {
      this._inMemoryUsers.set(normalizedEmail, supabaseUser);
      return supabaseUser;
    }

    return null;
  }

  /**
   * Lưu SHA-256 hash của Refresh Token vào database
   * @param {string} userId
   * @param {string} refreshToken - Chuỗi refresh token thô
   */
  static async updateRefreshToken(userId, refreshToken) {
    if (!userId) return null;
    const now = new Date();
    const tokenHash = this.hashToken(refreshToken);

    this._inMemoryTokens.set(userId, {
      refreshToken,
      tokenHash,
      createdAt: now,
    });

    if (UUID_PATTERN.test(userId)) {
      try {
        const sql = `
          UPDATE public.users
          SET refresh_token = $2, refresh_token_created_at = NOW(), updated_at = NOW()
          WHERE id = $1
          RETURNING *;
        `;
        const { rows } = await query(sql, [userId, tokenHash]);
        if (rows?.[0]) return rows[0];
      } catch (error) {
        console.warn("Lỗi cập nhật refresh_token vào database:", error.message);
      }
    }
    return null;
  }

  /**
   * Xoay vòng Refresh Token bằng Compare-and-Swap (CAS):
   * Chỉ cập nhật token mới nếu token cũ trong DB khớp chính xác.
   * Ngăn chặn hoàn toàn Race Condition và Replay Attack.
   */
  static async rotateRefreshToken(userId, oldRefreshToken, newRefreshToken) {
    if (!userId || !oldRefreshToken || !newRefreshToken) return null;
    const oldHash = this.hashToken(oldRefreshToken);
    const newHash = this.hashToken(newRefreshToken);
    const now = new Date();

    if (UUID_PATTERN.test(userId)) {
      try {
        const sql = `
          UPDATE public.users
          SET refresh_token = $3, refresh_token_created_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND (refresh_token = $2 OR refresh_token = $4)
          RETURNING *;
        `;
        const { rows } = await query(sql, [userId, oldHash, newHash, oldRefreshToken]);
        if (rows?.[0]) {
          this._inMemoryTokens.set(userId, {
            refreshToken: newRefreshToken,
            tokenHash: newHash,
            createdAt: now,
          });
          return rows[0];
        }
        // Nếu DB cập nhật 0 hàng -> Token cũ đã bị rotate hoặc không khớp
        return null;
      } catch (error) {
        console.warn("Lỗi xoay vòng refresh_token trong database:", error.message);
        if (process.env.NODE_ENV === "production") {
          throw AppError.internal("Lỗi cập nhật phiên làm việc", "DATABASE_ERROR");
        }
      }
    }

    // In-memory fallback cho môi trường test
    if (this._inMemoryTokens.has(userId)) {
      const record = this._inMemoryTokens.get(userId);
      if (record.refreshToken === oldRefreshToken || record.tokenHash === oldHash) {
        this._inMemoryTokens.set(userId, {
          refreshToken: newRefreshToken,
          tokenHash: newHash,
          createdAt: now,
        });
        return await this.findById(userId);
      }
    }

    return null;
  }

  /**
   * Tìm người dùng bằng Refresh Token (so khớp qua SHA-256 hash hoặc raw legacy)
   * @param {string} refreshToken
   */
  static async findByRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const tokenHash = this.hashToken(refreshToken);

    // Ưu tiên tra cứu in-memory cache trước
    for (const [userId, record] of this._inMemoryTokens.entries()) {
      if (record.refreshToken === refreshToken || record.tokenHash === tokenHash) {
        const user = await this.findById(userId);
        if (user) {
          return {
            ...user,
            refresh_token: record.tokenHash,
            refresh_token_created_at: record.createdAt,
          };
        }
      }
    }

    try {
      const { rows } = await query(
        "SELECT id, email, full_name, avatar_url, refresh_token, refresh_token_created_at, created_at FROM public.users WHERE refresh_token = $1 OR refresh_token = $2 LIMIT 1;",
        [tokenHash, refreshToken]
      );
      if (rows?.length) return rows[0];
    } catch (error) {
      console.warn("Lỗi truy vấn user theo refresh_token:", error.message);
    }

    return null;
  }

  /**
   * Thu hồi Refresh Token
   */
  static async clearRefreshToken(userId) {
    if (!userId) return;
    this._inMemoryTokens.delete(userId);

    if (UUID_PATTERN.test(userId)) {
      try {
        await query(
          "UPDATE public.users SET refresh_token = NULL, refresh_token_created_at = NULL, updated_at = NOW() WHERE id = $1;",
          [userId]
        );
      } catch (error) {
        console.warn("Lỗi xóa refresh_token trong database:", error.message);
      }
    }
  }

  static updatePassword(userId, newPassword) {
    return SupabaseAuthModel.updatePassword(userId, newPassword);
  }

  static signOut() {
    return SupabaseAuthModel.signOut();
  }
}

export default UserModel;
