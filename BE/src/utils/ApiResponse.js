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

  static error(error = null, message = "Đã xảy ra lỗi") {
    return {
      success: false,
      data: null,
      message,
      error: typeof error === "string" ? error : error?.message || error,
    };
  }
}

export default ApiResponse;
