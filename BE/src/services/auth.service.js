import UserModel from "../models/user.model.js";
import TokenModel from "../models/token.model.js";
import OtpModel from "../models/otp.model.js";
import TokenService from "./token.service.js";
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
   * Hàm dùng chung để phát hành app session (access + refresh token).
   * Gom logic lặp từ register, login, Google flows vào một nơi.
   * @param {object} publicUser - User đã được chuẩn hóa bởi UserModel.toPublicUser
   * @returns {{ accessToken, refreshToken }}
   */
  async #issueSession(publicUser) {
    const accessToken = TokenService.generateAccessToken(publicUser);
    const refreshToken = TokenService.generateRefreshToken();
    await TokenModel.updateRefreshToken(publicUser.id, refreshToken);
    return { accessToken, refreshToken };
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
      const publicUser = toPublicUser(createdUser);

      const { accessToken, refreshToken } = await this.#issueSession(publicUser);

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
   * Đăng nhập người dùng bằng email và mật khẩu
   * @param {{ email: string, password: string }} payload
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw AppError.badRequest("Email và mật khẩu là bắt buộc", "VALIDATION_ERROR");
    }

    try {
      const authUser = await UserModel.signInWithPassword({ email, password });
      const publicUser = toPublicUser(authUser);

      const { accessToken, refreshToken } = await this.#issueSession(publicUser);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      if (err.isOperational) throw err;
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
   * Xử lý callback sau khi Google OAuth thành công (Authorization Code Flow)
   */
  async handleGoogleCallback(code) {
    if (!code) {
      throw AppError.badRequest("Thiếu authorization code từ Google", "MISSING_CODE");
    }

    try {
      const authUser = await UserModel.exchangeCodeForSession(code);
      const publicUser = toPublicUser(authUser);

      const { accessToken, refreshToken } = await this.#issueSession(publicUser);

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
  async handleGoogleSession(token) {
    if (!token) {
      throw AppError.badRequest("Thiếu Access Token từ Google", "MISSING_TOKEN");
    }

    try {
      const authUser = await UserModel.getUserFromToken(token);
      if (!authUser) {
        throw AppError.unauthorized("Không tìm thấy thông tin xác thực từ token", "INVALID_TOKEN");
      }

      const publicUser = toPublicUser(authUser);
      const { accessToken, refreshToken } = await this.#issueSession(publicUser);

      return { accessToken, refreshToken, user: publicUser };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized(err.message || "Xác thực Google thất bại", "OAUTH_FAILED");
    }
  }

  /**
   * Làm mới Access Token từ Refresh Token (với cơ chế Refresh Token Rotation - RTR)
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized("Thiếu Refresh Token", "MISSING_REFRESH_TOKEN");
    }

    const user = await TokenModel.findByRefreshToken(refreshToken);
    if (!user) {
      throw AppError.unauthorized(
        "Refresh Token không hợp lệ hoặc đã hết hạn",
        "INVALID_REFRESH_TOKEN"
      );
    }

    // Kiểm tra xem refresh token đã quá hạn 5 ngày hay chưa
    if (TokenService.isRefreshTokenExpired(user.refresh_token_created_at)) {
      await TokenModel.clearRefreshToken(user.id);
      throw AppError.unauthorized(
        "Refresh Token đã hết hạn",
        "REFRESH_TOKEN_EXPIRED"
      );
    }

    const publicUser = toPublicUser(user);
    // RTR: Rotate cả access token và refresh token cùng lúc bằng Compare-and-Swap (CAS)
    const newAccessToken = TokenService.generateAccessToken(publicUser);
    const newRefreshToken = TokenService.generateRefreshToken();

    const rotated = await TokenModel.rotateRefreshToken(
      user.id,
      refreshToken,
      newRefreshToken
    );

    if (!rotated) {
      throw AppError.unauthorized(
        "Refresh Token không hợp lệ hoặc đã được sử dụng",
        "INVALID_REFRESH_TOKEN"
      );
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: publicUser,
    };
  }

  /**
   * Tìm người dùng theo refresh token hiện tại
   */
  async getUserByRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    return TokenModel.findByRefreshToken(refreshToken);
  }

  /**
   * Đăng xuất tài khoản và thu hồi refresh token trong CSDL
   */
  async logout(userId) {
    if (userId) {
      await TokenModel.clearRefreshToken(userId);
    }
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
