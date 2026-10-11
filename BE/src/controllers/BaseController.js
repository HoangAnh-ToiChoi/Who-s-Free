import ApiResponse from "../utils/ApiResponse.js";

/**
 * BaseController - Class cha cho toàn bộ Controller trong hệ thống
 */
class BaseController {
  sendSuccess(res, data, message = "Thành công", statusCode = 200) {
    return res.status(statusCode).json(ApiResponse.success(data, message));
  }

  sendCreated(res, data, message = "Tạo thành công") {
    return res.status(201).json(ApiResponse.success(data, message));
  }

  sendError(res, error, message = "Đã xảy ra lỗi", statusCode = 400) {
    return res.status(statusCode).json(ApiResponse.error(error, message));
  }
}

export default BaseController;
