import { query } from "../configs/db.config.js";
import SupabaseAuthModel from "./supabase-auth.model.js";
import { isUuid } from "../utils/uuid.js";

/** Data access for application users (public.users profile fields only). */
class UserModel {
  // In-memory store used by test environments (no real DB available in unit tests).
  // In production, DB is always the source of truth — these maps act only as a
  // short-lived write-through cache. Max size prevents unbounded memory growth.
  static _inMemoryUsers = new Map();
  static #MAX_CACHE_SIZE = 500;

  static #pruneUserCache() {
    if (this._inMemoryUsers.size < this.#MAX_CACHE_SIZE) return;
    const iter = this._inMemoryUsers.keys();
    for (let i = 0; i < 50; i++) {
      const key = iter.next().value;
      if (key !== undefined) this._inMemoryUsers.delete(key);
    }
  }

  /** Persist Supabase Auth profile data in public.users. */
  static async upsertToDatabase({ id, email, fullName, avatarUrl }) {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase().trim();
    const validId = isUuid(id) ? id : null;

    const userRecord = {
      id: validId || id || `usr-${Date.now()}`,
      email: normalizedEmail,
      full_name: fullName || email.split("@")[0],
      avatar_url: avatarUrl || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === "test") {
      this.#pruneUserCache();
      if (userRecord.id) {
        this._inMemoryUsers.set(userRecord.id, userRecord);
        this._inMemoryUsers.set(normalizedEmail, userRecord);
      }
      return userRecord;
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

    const { rows } = await query(sql, [
      validId,
      normalizedEmail,
      fullName || email.split("@")[0],
      avatarUrl || "",
    ]);

    if (rows?.[0]) {
      this.#pruneUserCache();
      this._inMemoryUsers.set(rows[0].id, rows[0]);
      this._inMemoryUsers.set(normalizedEmail, rows[0]);
      return rows[0];
    }

    return userRecord;
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

  static async createConfirmedInAuth({ email, password, fullName }) {
    const authUser = await SupabaseAuthModel.createConfirmedUser({
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

  static getGoogleOAuthUrl(redirectTo, queryParams) {
    return SupabaseAuthModel.getGoogleOAuthUrl(redirectTo, queryParams);
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

    if (this._inMemoryUsers.has(userId)) {
      return this._inMemoryUsers.get(userId);
    }

    if (isUuid(userId)) {
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
      this.#pruneUserCache();
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
      this.#pruneUserCache();
      this._inMemoryUsers.set(normalizedEmail, supabaseUser);
      return supabaseUser;
    }

    return null;
  }

  static updatePassword(userId, newPassword) {
    return SupabaseAuthModel.updatePassword(userId, newPassword);
  }

  static signOut() {
    return SupabaseAuthModel.signOut();
  }
}

export default UserModel;
