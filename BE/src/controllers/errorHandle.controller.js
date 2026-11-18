import ApiResponse from "./response.controller.js";
import { resolveError } from "../configs/error.config.js";

/**
 * AppError - Lớp định nghĩa lỗi tập trung (Centralized Operational Error)
 *
 * Cho phép ném lỗi từ Service/Middleware với HTTP Status Code, Error Code và Details rõ ràng,
 * giúp Controller và Global Error Handler tự động nhận diện và xử lý triệt để.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Dữ liệu yêu cầu không hợp lệ", errorCode = "BAD_REQUEST", details = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = "Xác thực không thành công", errorCode = "UNAUTHORIZED") {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = "Bạn không có quyền thực hiện thao tác này", errorCode = "FORBIDDEN") {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = "Không tìm thấy dữ liệu yêu cầu", errorCode = "NOT_FOUND") {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message = "Dữ liệu đã tồn tại trong hệ thống", errorCode = "CONFLICT", details = null) {
    return new AppError(message, 409, errorCode, details);
  }


  static internal(message = "Lỗi máy chủ nội bộ", errorCode = "INTERNAL_SERVER_ERROR") {
    return new AppError(message, 500, errorCode);
  }
}

// Mọi lỗi từ controller / service / model đều rơi về đây (nhờ next(err) hoặc throw)
class ErrorHandleController {
  notFound(req, res) {
    res.status(404).json(
      ApiResponse.error(
        "ROUTE_NOT_FOUND",
        `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại`,
      ),
    );
  }

  handle(err, req, res, next) {
    let { statusCode, errorCode, message, details } = resolveError(err);

    // Production: giấu chi tiết lỗi hệ thống
    if (statusCode >= 500) {
      console.error("🔥 [INTERNAL SERVER ERROR]:", err);
      if (process.env.NODE_ENV === "production") {
        message = "Lỗi hệ thống nội bộ. Vui lòng thử lại sau.";
        details = null;
      }
    }

    res.status(statusCode).json(ApiResponse.error(errorCode, message, details));
  }
}

export default new ErrorHandleController();
