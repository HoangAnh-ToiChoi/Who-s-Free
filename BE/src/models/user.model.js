import supabase from "../configs/supabase.config.js";

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
   * Tạo tài khoản mới trên Supabase Auth
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
    return data?.user || null;
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
    return data?.user || null;
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
    return data?.user || null;
  }

  /**
   * Tìm người dùng theo ID từ Supabase Admin
   */
  static async findById(userId) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    return data.user;
  }

  /**
   * Tìm người dùng theo Email
   */
  static async findByEmail(email) {
    const normalized = (email || "").toLowerCase();
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error || !data?.users) return null;

    const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
    return user || null;
  }

  /**
   * Cập nhật mật khẩu mới cho người dùng
   */
  static async updatePassword(userId, newPassword) {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
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
