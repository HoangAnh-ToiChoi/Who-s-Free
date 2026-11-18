import { z } from "zod";

/**
 * Validation Schemas cho Module Xác thực (Auth)
 */
export const registerSchema = z.object({
  email: z
    .string({ error: "Email là bắt buộc" })
    .trim()
    .min(1, "Email là bắt buộc")
    .email("Email không đúng định dạng"),
  password: z
    .string({ error: "Mật khẩu là bắt buộc" })
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự"),
  fullName: z.string().trim().optional(),
});

export const inviteRegisterSchema = z.object({
  password: z
    .string({ error: "Mật khẩu là bắt buộc" })
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự"),
  fullName: z.string().trim().min(1, "Họ tên là bắt buộc"),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email là bắt buộc" })
    .trim()
    .min(1, "Email là bắt buộc")
    .email("Email không đúng định dạng"),
  password: z
    .string({ error: "Mật khẩu là bắt buộc" })
    .min(1, "Mật khẩu là bắt buộc"),
});

export const googleSessionSchema = z.object({
  accessToken: z
    .string({ error: "Thiếu Access Token từ Google" })
    .min(1, "Thiếu Access Token từ Google"),
  // refreshToken từ FE không được dùng — BE tự tạo mới (AUTH_REFACTOR_PLAN §82)
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: "Email là bắt buộc" })
    .trim()
    .min(1, "Email là bắt buộc")
    .email("Email không đúng định dạng"),
});

export const verifyOtpSchema = z.object({
  email: z
    .string({ error: "Email là bắt buộc" })
    .trim()
    .min(1, "Email là bắt buộc")
    .email("Email không đúng định dạng"),
  otp: z
    .string({ error: "Mã OTP là bắt buộc" })
    .trim()
    .regex(/^\d{6}$/, "Mã OTP phải gồm 6 chữ số"),
});

export const resetPasswordSchema = z
  .object({
    email: z
      .string({ error: "Email là bắt buộc" })
      .trim()
      .min(1, "Email là bắt buộc")
      .email("Email không đúng định dạng"),
    resetToken: z
      .string({ error: "Thiếu token đặt lại mật khẩu" })
      .min(1, "Thiếu token đặt lại mật khẩu"),
    password: z
      .string({ error: "Mật khẩu mới là bắt buộc" })
      .min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự"),
    confirmPassword: z
      .string({ error: "Mật khẩu xác nhận là bắt buộc" })
      .min(1, "Mật khẩu xác nhận là bắt buộc"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu mới và mật khẩu xác nhận không khớp nhau",
    path: ["confirmPassword"],
  });

export const googleCallbackQuerySchema = z.object({
  code: z
    .string({ error: "Thiếu authorization code từ Google" })
    .min(1, "Thiếu authorization code từ Google"),
});

export default {
  registerSchema,
  loginSchema,
  googleSessionSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  googleCallbackQuerySchema,
};
