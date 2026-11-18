import supabase, { supabaseAdmin, supabaseConfig } from "../configs/supabase.config.js";
import { appConfig } from "../configs/app.config.js";

/** Data access adapter for Supabase Auth and its admin user directory. */
class SupabaseAuthModel {
  static getAdminClient() {
    if (appConfig.isTest || !supabaseAdmin?.auth?.admin) {
      return supabase;
    }
    return supabaseAdmin;
  }

  /**
   * Tạo tài khoản email + mật khẩu qua Admin API (Supabase không tự gửi thư xác nhận — BE tự gửi OTP qua Brevo).
   * confirmed = true: đã xác nhận sẵn (người đi vào từ link lời mời gửi tới chính email đó).
   * Cần SUPABASE_SERVICE_ROLE_KEY hợp lệ.
   */
  static async createUser({ email, password, fullName, confirmed = false }) {
    if (!this.hasValidAdminRoleKey()) {
      throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY hợp lệ để tạo tài khoản");
    }
    const { data, error } = await this.getAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: confirmed,
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
    const key = supabaseConfig.serviceRoleKey;
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

  /** Cập nhật tài khoản qua Admin API (vd { password }, { email_confirm: true }, { user_metadata }). */
  static async updateUser(userId, attributes) {
    const { data, error } = await this.getAdminClient().auth.admin.updateUserById(userId, attributes);
    if (error) throw error;
    return data?.user || null;
  }

  static async deleteUser(userId) {
    const { error } = await this.getAdminClient().auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  static updatePassword(userId, newPassword) {
    return this.updateUser(userId, { password: newPassword });
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }
}

export default SupabaseAuthModel;
