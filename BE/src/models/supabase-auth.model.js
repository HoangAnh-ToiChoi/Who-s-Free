import supabase, { supabaseAdmin } from "../configs/supabase.config.js";

/** Data access adapter for Supabase Auth and its admin user directory. */
class SupabaseAuthModel {
  static getAdminClient() {
    if (process.env.NODE_ENV === "test" || !supabaseAdmin?.auth?.admin) {
      return supabase;
    }
    return supabaseAdmin;
  }

  static async createUser({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || "" } },
    });

    if (error) throw error;
    return data?.user || null;
  }

  /**
   * Tạo tài khoản đã xác nhận email (dùng khi người dùng đi vào từ link lời mời gửi tới chính email đó).
   * Cần SUPABASE_SERVICE_ROLE_KEY hợp lệ.
   */
  static async createConfirmedUser({ email, password, fullName }) {
    if (!this.hasValidAdminRoleKey()) {
      throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY hợp lệ để tạo tài khoản từ lời mời");
    }
    const { data, error } = await this.getAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || "" },
    });
    if (error) throw error;
    return data?.user || null;
  }

  static async signInWithPassword({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data?.user || null;
  }

  static async getGoogleOAuthUrl(redirectTo, queryParams) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, ...(queryParams && { queryParams }) },
    });
    if (error) throw error;
    return data?.url;
  }

  static async exchangeCodeForSession(code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data?.user || null;
  }

  static async getUserFromToken(accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) throw error;
    return data?.user || null;
  }

  static hasValidAdminRoleKey() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!key) return false;
    if (key.startsWith("sb_publishable_") || key.startsWith("pk_")) return false;
    return true;
  }

  static async findById(userId) {
    if (!this.hasValidAdminRoleKey()) return null;
    try {
      const { data, error } = await this.getAdminClient().auth.admin.getUserById(userId);
      return error ? null : data?.user || null;
    } catch {
      return null;
    }
  }

  static async findByEmail(email) {
    if (!this.hasValidAdminRoleKey()) return null;
    try {
      const { data, error } = await this.getAdminClient().auth.admin.listUsers({ perPage: 1000 });
      if (error) {
        console.error("Supabase Admin user lookup failed:", error.message);
        return null;
      }
      return data?.users?.find((user) => user.email?.toLowerCase() === email) || null;
    } catch {
      return null;
    }
  }

  static async updatePassword(userId, newPassword) {
    const { data, error } = await this.getAdminClient().auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) throw error;
    return data?.user || null;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }
}

export default SupabaseAuthModel;
