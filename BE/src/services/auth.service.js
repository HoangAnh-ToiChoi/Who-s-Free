import UserModel from "../models/user.model.js";
import OtpModel from "../models/otp.model.js";
import AuthSessionService from "./auth-session.service.js";
import AppError from "../utils/AppError.js";
import { toPublicUser } from "../utils/mappers/user.mapper.js";

/**
 * AuthService - Nghiệp vụ Xác thực Người dùng (Core Authentication Service)
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Điều phối luồng Đăng ký, Đăng nhập, Làm mới Token, Đăng xuất, Lấy thông tin user
 *   - Sử dụng UserModel để truy vấn dữ liệu và chuẩn hóa toPublicUser
 *   - Sử dụng TokenService để cấp phát JWT
 *
 * Contract theo AUTH_REFACTOR_PLAN:
 *   - Service trả { user, accessToken, refreshToken } cho Controller
 *   - Controller chịu trách nhiệm đặt cookie và loại refreshToken khỏi JSON response
 */
class AuthService {
  /**
   * Getter tương thích ngược cho otpStore (ủy quyền tới OtpModel)
   */
  static get otpStore() {
    return OtpModel.store;
  }

  /**
   * Phát hành phiên cho thiết bị đang đăng nhập (access + refresh token). Mỗi loại thiết bị giữ 1 phiên.
   * @param {object} publicUser - User đã được chuẩn hóa bởi toPublicUser
   * @param {{ kind: string, userAgent: string }} device - từ deviceFromRequest(req)
   * @returns {{ accessToken, refreshToken }}
   */
  #issueSession(publicUser, device) {
    return AuthSessionService.issue(publicUser, device);
  }

  /**
   * Đăng ký tài khoản mới bằng email và mật khẩu
   * @param {{ email: string, password: string, fullName?: string }} payload
   */
  async register({ email, password, fullName }, device) {
    if (!email || !password) {
      throw AppError.badRequest("Email và mật khẩu là bắt buộc", "VALIDATION_ERROR");
    }

    try {
      const createdUser = await UserModel.createInAuth({ email, password, fullName });
      const publicUser = toPublicUser(createdUser);

      const { accessToken, refreshToken } = await this.#issueSession(publicUser, device);

      return {
        user: publicUser,
        accessToken,
        refreshToken,
        message: "Đăng ký tài khoản thành công!",
      };
    } catch (err) {
      if (err.isOperational) throw err;
      throw AppError.badRequest(err.message || "Đăng ký tài khoản thất bại", "REGISTER_FAILED");
    }
  }

  /**
   * Tạo tài khoản đã xác nhận email cho người được mời (email lấy từ lời mời đã kiểm tra) và đăng nhập luôn.
   * @param {{ email: string, password: string, fullName?: string }} payload
   */
  async registerInvitedUser({ email, password, fullName }, device) {
    try {
      const createdUser = await UserModel.createConfirmedInAuth({ email, password, fullName });
      const publicUser = toPublicUser(createdUser);
      const { accessToken, refreshToken } = await this.#issueSession(publicUser, device);
      return { user: publicUser, accessToken, refreshToken };
    } catch (err) {
      if (err.isOperational) throw err;
      throw AppError.badRequest(err.message || "Tạo tài khoản thất bại", "REGISTER_FAILED");
    }
  }

  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   * @param {{ email: string, password: string }} payload
   */
  async login({ email, password }, device) {
    if (!email || !password) {
      throw AppError.badRequest("Email và mật khẩu là bắt buộc", "VALIDATION_ERROR");
    }

    try {
      const authUser = await UserModel.signInWithPassword({ email, password });
      const publicUser = toPublicUser(authUser);

      const { accessToken, refreshToken } = await this.#issueSession(publicUser, device);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      if (err.isOperational) throw err;
      throw AppError.unauthorized("Email hoặc mật khẩu không chính xác", "INVALID_CREDENTIALS");
    }
  }

  /**
   * Lấy URL đăng nhập Google OAuth
   */
  async getGoogleOAuthUrl(redirectTo, queryParams) {
    try {
      const url = await UserModel.getGoogleOAuthUrl(redirectTo, queryParams);
      return { url };
    } catch (err) {
      throw AppError.badRequest(err.message, "OAUTH_INIT_FAILED");
    }
  }

  /**
   * Xử lý callback sau khi Google OAuth thành công (Authorization Code Flow)
   */
  async handleGoogleCallback(code, device) {
    if (!code) {
      throw AppError.badRequest("Thiếu authorization code từ Google", "MISSING_CODE");
    }

    try {
      const authUser = await UserModel.exchangeCodeForSession(code);
      const publicUser = toPublicUser(authUser);

      const { accessToken, refreshToken } = await this.#issueSession(publicUser, device);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      if (err.isOperational) throw err;
      throw AppError.unauthorized("Xác thực Google OAuth thất bại", "OAUTH_FAILED");
    }
  }

  /**
   * Xử lý khởi tạo session từ Supabase OAuth token (khi dùng Implicit Hash Flow)
   * Lưu ý: refreshToken từ FE bị bỏ qua — BE tự tạo refresh token app mới
   * @param {string} token - Supabase access token
   */
  async handleGoogleSession(token, device) {
    if (!token) {
      throw AppError.badRequest("Thiếu Access Token từ Google", "MISSING_TOKEN");
    }

    try {
      const authUser = await UserModel.getUserFromToken(token);
      if (!authUser) {
        throw AppError.unauthorized("Không tìm thấy thông tin xác thực từ token", "INVALID_TOKEN");
      }

      const publicUser = toPublicUser(authUser);
      const { accessToken, refreshToken } = await this.#issueSession(publicUser, device);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized(err.message || "Xác thực Google thất bại", "OAUTH_FAILED");
    }
  }

  /** Làm mới Access Token từ Refresh Token (Refresh Token Rotation theo phiên thiết bị) */
  async refreshAccessToken(refreshToken) {
    return AuthSessionService.refresh(refreshToken);
  }

  /** Đăng xuất thiết bị đang dùng: thu hồi đúng phiên của refresh token trong cookie */
  async logout(refreshToken) {
    await AuthSessionService.revoke(refreshToken);
    // Không gọi Supabase signOut vì app chỉ dùng app token, không dùng Supabase session
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

    return toPublicUser(user);
  }
}

export default AuthService;
