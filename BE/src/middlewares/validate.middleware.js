import AppError from "../utils/AppError.js";

/**
 * Middleware validate request với Zod Schema
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Kiểm tra tính hợp lệ của dữ liệu đầu vào (req.body, req.query, req.params)
 *   - Chuẩn hóa và gán lại dữ liệu đã sanitize (trim, type cast, default value)
 *   - Chuyển tiếp lỗi validation có cấu trúc chi tiết tới Global Error Handler
 *
 * @param {import('zod').ZodSchema} schema - Zod Schema cần kiểm tra
 * @param {"body" | "query" | "params"} source - Nguồn dữ liệu trong request (mặc định: "body")
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues || [];
      const firstIssue = issues[0];
      const message = firstIssue?.message || "Dữ liệu yêu cầu không hợp lệ";

      const details = issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(AppError.badRequest(message, "VALIDATION_ERROR", details));
    }

    // Cập nhật lại dữ liệu đã qua sanitize vào request
    req[source] = result.data;
    return next();
  };
};

export default validate;
