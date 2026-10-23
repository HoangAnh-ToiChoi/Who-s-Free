import { z } from "zod";

/**
 * Validation Schemas cho Module Nhóm (Group & Members)
 */
export const createGroupSchema = z
  .object({
    name: z
      .string({ required_error: "Tên nhóm là bắt buộc" })
      .trim()
      .min(2, "Tên nhóm phải có tối thiểu 2 ký tự")
      .max(100, "Tên nhóm không được vượt quá 100 ký tự"),
    category: z.enum(["work", "hangout", "other"]).optional().default("work"),
    description: z.string().trim().max(500, "Mô tả tối đa 500 ký tự").optional().default(""),
    capacity: z.coerce
      .number({ invalid_type_error: "Sức chứa phải là số nguyên" })
      .int("Sức chứa phải là số nguyên")
      .min(2, "Sức chứa tối thiểu 2 người")
      .max(100, "Sức chứa tối đa 100 người")
      .optional()
      .default(10),
    color: z.string().trim().optional().default("indigo"),
    icon: z.string().trim().optional().default("Users"),
    cohort: z.string().trim().optional().default("2026"),
  })
  .strict("Không được phép gửi các trường không hợp lệ hoặc trường hệ thống");

export const updateGroupSchema = z
  .object({
    name: z.string().trim().min(2, "Tên nhóm phải có tối thiểu 2 ký tự").max(100, "Tên nhóm không được vượt quá 100 ký tự").optional(),
    category: z.enum(["work", "hangout", "other"]).optional(),
    description: z.string().trim().max(500, "Mô tả tối đa 500 ký tự").optional(),
    capacity: z.coerce
      .number({ invalid_type_error: "Sức chứa phải là số nguyên" })
      .int("Sức chứa phải là số nguyên")
      .min(2, "Sức chứa tối thiểu 2 người")
      .max(100, "Sức chứa tối đa 100 người")
      .optional(),
    color: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    cohort: z.string().trim().optional(),
  })
  .strict("Không được phép sửa các trường không hợp lệ hoặc trường hệ thống")
  .refine((data) => Object.keys(data).length > 0, {
    message: "Body cập nhật không được để trống",
  });

export const addMemberSchema = z
  .object({
    email: z.string().trim().email("Email không đúng định dạng").optional(),
    userId: z
      .string()
      .trim()
      .regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
        "userId phải là định dạng UUID hợp lệ"
      )
      .optional(),
    role: z.enum(["lead", "member"]).optional().default("member"),
    groupRole: z.enum(["leadership", "core", "guest"]).optional().default("core"),
  })
  .strict("Không được phép gửi các trường không hợp lệ")
  .refine((data) => Boolean(data.email || data.userId), {
    message: "Vui lòng cung cấp email hoặc userId của thành viên cần thêm",
    path: ["email"],
  });

export const createInvitationSchema = z
  .object({
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .trim()
      .email("Email không đúng định dạng")
      .toLowerCase(),
    role: z.enum(["lead", "member"]).optional().default("member"),
  })
  .strict("Không được phép gửi các trường không hợp lệ");

export default {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  createInvitationSchema,
};

