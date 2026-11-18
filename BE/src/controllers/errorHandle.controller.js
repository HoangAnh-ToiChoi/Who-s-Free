import BaseController from "./BaseController.js";
import ApiResponse from "../utils/ApiResponse.js";
import { resolveError } from "../configs/error.config.js";

// Mọi lỗi từ controller / service / model đều rơi về đây (nhờ next(err) hoặc throw)
class ErrorHandleController extends BaseController {
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
