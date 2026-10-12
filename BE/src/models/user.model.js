import { query } from "../configs/db.config.js";
import SupabaseAuthModel from "./supabase-auth.model.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Data access and public entity mapping for application users. */
class UserModel {
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

    const validId = UUID_PATTERN.test(id || "") ? id : null;
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
        email.toLowerCase().trim(),
        fullName || email.split("@")[0],
        avatarUrl || "",
      ]);
      return rows[0] || null;
    } catch (error) {
      console.warn("Lỗi khi ghi user vào public.users database:", error.message);
      return null;
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

    return SupabaseAuthModel.findById(userId);
  }

  static async findByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { rows } = await query(
        "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE LOWER(email) = $1 LIMIT 1;",
        [normalizedEmail]
      );
      if (rows?.length) return rows[0];
    } catch (error) {
      console.warn("Lỗi truy vấn users table theo email:", error.message);
    }

    return SupabaseAuthModel.findByEmail(normalizedEmail);
  }

  static updatePassword(userId, newPassword) {
    return SupabaseAuthModel.updatePassword(userId, newPassword);
  }

  static signOut() {
    return SupabaseAuthModel.signOut();
  }
}

export default UserModel;
