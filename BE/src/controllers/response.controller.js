/**
 * Mọi phản hồi của API đi qua file này: một khuôn { success, data, message, error, details? }.
 * Controller gọi sendSuccess / sendCreated; errorHandle.controller dùng ApiResponse.error.
 */
class ApiResponse {
  static success(data = null, message = "Thành công") {
    return {
      success: true,
      data,
      message,
      error: null,
    };
  }

  static error(error = null, message = "Đã xảy ra lỗi", details = null) {
    const response = {
      success: false,
      data: null,
      message,
      error: typeof error === "string" ? error : error?.message || "ERROR",
    };

    if (details !== null && details !== undefined) {
      response.details = details;
    }

    return response;
  }
}

export const sendSuccess = (res, data, message = "Thành công", statusCode = 200) =>
  res.status(statusCode).json(ApiResponse.success(data, message));

export const sendCreated = (res, data, message = "Tạo thành công") =>
  res.status(201).json(ApiResponse.success(data, message));

export default ApiResponse;
