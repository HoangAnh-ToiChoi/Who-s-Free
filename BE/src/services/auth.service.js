import UserModel from "../models/user.model.js";
import OtpModel from "../models/otp.model.js";
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
   * Getter tương thích ngược cho otpStore (ủy quyền tới OtpModel)
   */
  static get otpStore() {
    return OtpModel.store;
  }
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

      // Cấp JWT Token ngay sau khi đăng ký thành công để đăng nhập tức thì
      const accessToken = TokenService.generateAccessToken(publicUser);
      const refreshToken = TokenService.generateRefreshToken(publicUser);

      return {
        user: publicUser,
        accessToken,
        refreshToken,
        message: "Đăng ký tài khoản thành công!",
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
   * Xử lý khởi tạo session từ Supabase OAuth token (khi dùng Implicit Hash Flow)
   */
  async handleGoogleSession(token, refreshToken) {
    if (!token) {
      throw AppError.badRequest("Thiếu Access Token từ Google", "MISSING_TOKEN");
    }

    try {
      const authUser = await UserModel.getUserFromToken(token);
      if (!authUser) {
        throw AppError.unauthorized("Không tìm thấy thông tin xác thực từ token", "INVALID_TOKEN");
      }

      const publicUser = UserModel.toPublicUser(authUser);
      const accessToken = TokenService.generateAccessToken(publicUser);
      const newRefreshToken = TokenService.generateRefreshToken(publicUser);

      return { accessToken, refreshToken: newRefreshToken, user: publicUser };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized(err.message || "Xác thực Google thất bại", "OAUTH_FAILED");
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
