import UserModel from "../models/user.model.js";
import TokenService from "./token.service.js";
import AppError from "../utils/AppError.js";

/**
 * AuthService - Nghiệp vụ Xác thực Người dùng (Core Authentication Service)
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Điều phối luồng Đăng ký, Đăng nhập, Làm mới Token, Đăng xuất, Lấy thông tin user
 *   - Sử dụng UserModel để truy vấn dữ liệu và chuẩn hóa toPublicUser
 *   - Sử dụng TokenService để cấp phát JWT
 */
class AuthService {
  /**
   * Đăng ký tài khoản mới bằng email và mật khẩu
   * @param {{ email: string, password: string, fullName?: string }} payload
   */
  async register({ email, password, fullName }) {
    if (!email || !password) {
      throw AppError.badRequest("Email và mật khẩu là bắt buộc", "VALIDATION_ERROR");
    }

    try {
      const createdUser = await UserModel.createInAuth({ email, password, fullName });
      const publicUser = UserModel.toPublicUser(createdUser);

      return {
        user: publicUser,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.",
      };
    } catch (err) {
      throw AppError.badRequest(err.message || "Đăng ký tài khoản thất bại", "REGISTER_FAILED");
    }
  }

  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   * @param {{ email: string, password: string }} payload
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw AppError.badRequest("Email và mật khẩu là bắt buộc", "VALIDATION_ERROR");
    }

    try {
      const authUser = await UserModel.signInWithPassword({ email, password });
      const publicUser = UserModel.toPublicUser(authUser);

      const accessToken = TokenService.generateAccessToken(publicUser);
      const refreshToken = TokenService.generateRefreshToken(publicUser);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      throw AppError.unauthorized("Email hoặc mật khẩu không chính xác", "INVALID_CREDENTIALS");
    }
  }

  /**
   * Lấy URL đăng nhập Google OAuth
   */
  async getGoogleOAuthUrl(redirectTo) {
    try {
      const url = await UserModel.getGoogleOAuthUrl(redirectTo);
      return { url };
    } catch (err) {
      throw AppError.badRequest(err.message, "OAUTH_INIT_FAILED");
    }
  }

  /**
   * Xử lý callback sau khi Google OAuth thành công
   */
  async handleGoogleCallback(code) {
    if (!code) {
      throw AppError.badRequest("Thiếu authorization code từ Google", "MISSING_CODE");
    }

    try {
      const authUser = await UserModel.exchangeCodeForSession(code);
      const publicUser = UserModel.toPublicUser(authUser);

      const accessToken = TokenService.generateAccessToken(publicUser);
      const refreshToken = TokenService.generateRefreshToken(publicUser);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      throw AppError.unauthorized("Xác thực Google OAuth thất bại", "OAUTH_FAILED");
    }
  }

  /**
   * Làm mới Access Token từ Refresh Token
   */
  async refreshAccessToken(refreshToken) {
    const decoded = TokenService.verifyRefreshToken(refreshToken);

    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      throw AppError.unauthorized("Người dùng không còn tồn tại", "USER_NOT_FOUND");
    }

    const publicUser = UserModel.toPublicUser(user);
    const newAccessToken = TokenService.generateAccessToken(publicUser);

    return { accessToken: newAccessToken };
  }

  /**
   * Đăng xuất tài khoản
   */
  async logout() {
    await UserModel.signOut();
    return { message: "Đăng xuất thành công" };
  }

  /**
   * Lấy thông tin người dùng đang đăng nhập
   */
  async getMe(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.notFound("Không tìm thấy thông tin người dùng", "USER_NOT_FOUND");
    }

    return UserModel.toPublicUser(user);
  }
}

export default AuthService;
