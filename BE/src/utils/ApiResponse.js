/**
 * ApiResponse - Chuẩn hóa Response Envelope cho toàn bộ Backend
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

export default ApiResponse;
