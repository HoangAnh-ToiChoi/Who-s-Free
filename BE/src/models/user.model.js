import supabase, { supabaseAdmin } from "../configs/supabase.config.js";
import { query } from "../configs/db.config.js";

/**
 * UserModel - Data Access Layer cho Thực thể Người dùng (User Entity)
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Truy vấn và đồng bộ dữ liệu người dùng với Supabase Auth / PostgreSQL DB
 *   - Chuẩn hóa cấu trúc thực thể người dùng (toPublicUser) để tái sử dụng xuyên suốt toàn hệ thống
 */
class UserModel {
  /**
   * Chuẩn hóa thực thể User trả về cho Client hoặc lưu trữ Session.
   * Xử lý tập trung 1 nơi duy nhất, loại bỏ hoàn toàn việc mapping lặp lại.
   *
   * @param {object} rawUser
   * @returns {{ id: string, email: string, fullName: string, avatarUrl: string, role: string, createdAt: string }}
   */
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
        rawUser.avatar_url ||
        metadata.avatar_url ||
        rawUser.avatarUrl ||
        "",
      role: rawUser.role || metadata.role || "member",
      createdAt:
        rawUser.created_at ||
        rawUser.createdAt ||
        new Date().toISOString(),
    };
  }

  /**
   * Lưu hoặc cập nhật người dùng vào bảng public.users trong PostgreSQL DB
   * @param {{ id?: string, email: string, fullName?: string, avatarUrl?: string }} payload
   */
  static async upsertToDatabase({ id, email, fullName, avatarUrl }) {
    if (!email) return null;
    try {
      const text = `
        INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
        VALUES (
          COALESCE($1::uuid, gen_random_uuid()),
          $2,
          $3,
          $4,
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.users.avatar_url),
          updated_at = NOW()
        RETURNING *;
      `;
      const params = [
        id || null,
        email.toLowerCase(),
        fullName || email.split("@")[0],
        avatarUrl || "",
      ];
      const { rows } = await query(text, params);
      return rows[0] || null;
    } catch (err) {
      console.error("Lỗi khi ghi user vào public.users database:", err.message);
      return null;
    }
  }

  /**
   * Tạo tài khoản mới trên Supabase Auth và lưu ngay vào DB
   */
  static async createInAuth({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: { full_name: fullName || "" },
      },
    });

    if (error) throw error;
    const authUser = data?.user || null;

    if (authUser) {
      await this.upsertToDatabase({
        id: authUser.id,
        email: authUser.email,
        fullName: fullName || authUser.user_metadata?.full_name,
        avatarUrl: authUser.user_metadata?.avatar_url,
      });
    }

    return authUser;
  }

  /**
   * Xác thực tài khoản bằng Email và Password
   */
  static async signInWithPassword({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) throw error;
    const authUser = data?.user || null;

    if (authUser) {
      await this.upsertToDatabase({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.user_metadata?.full_name,
        avatarUrl: authUser.user_metadata?.avatar_url,
      });
    }

    return authUser;
  }

  /**
   * Lấy URL đăng nhập Google OAuth
   */
  static async getGoogleOAuthUrl(redirectTo) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) throw error;
    return data?.url;
  }

  /**
   * Trao đổi mã Authorization Code lấy session
   */
  static async exchangeCodeForSession(code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    const authUser = data?.user || null;

    if (authUser) {
      await this.upsertToDatabase({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
        avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
      });
    }

    return authUser;
  }

  /**
   * Lấy thông tin người dùng từ Supabase Access Token và đồng bộ vào DB
   */
  static async getUserFromToken(accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) throw error;
    const authUser = data?.user || null;

    if (authUser) {
      await this.upsertToDatabase({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
        avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
      });
    }

    return authUser;
  }

  /**
   * Tìm người dùng theo ID từ Database PostgreSQL
   */
  static async findById(userId) {
    if (!userId) return null;
    try {
      const text = "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE id = $1 LIMIT 1;";
      const { rows } = await query(text, [userId]);
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("Lỗi truy vấn users table theo id:", err.message);
    }

    try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !data?.user) return null;
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Tìm người dùng theo Email từ Database PostgreSQL
   */
  static async findByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    try {
      const text = "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE LOWER(email) = $1 LIMIT 1;";
      const { rows } = await query(text, [normalized]);
      if (rows && rows.length > 0) return rows[0];
    } catch (err) {
      console.warn("Lỗi truy vấn users table theo email:", err.message);
    }

    try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error("Supabase Admin user lookup failed:", error.message);
      throw error;
    }
    if (!data?.users) return null;
      return data.users.find((u) => u.email?.toLowerCase() === normalized) || null;
    } catch {
      return null;
    }
  }

  /**
   * Cập nhật mật khẩu mới cho người dùng
   */
  static async updatePassword(userId, newPassword) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;
    return data?.user || null;
  }

  /**
   * Đăng xuất session phía Supabase
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }
}

export default UserModel;
