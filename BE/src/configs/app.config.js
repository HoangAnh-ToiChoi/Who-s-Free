// Cấu hình chung của server. Đọc lại process.env mỗi lần truy cập (getter) để test đổi biến môi trường vẫn có hiệu lực.
const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";

export const appConfig = {
  get env() {
    return process.env.NODE_ENV || "development";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get isTest() {
    return process.env.NODE_ENV === "test";
  },
  get port() {
    return process.env.PORT || 5000;
  },
  /** URL của FE, dùng để dựng link trong email / redirect sau đăng nhập Google */
  get clientOrigin() {
    return process.env.CLIENT_ORIGIN || DEFAULT_CLIENT_ORIGIN;
  },
  /** Các origin được CORS cho phép: CLIENT_ORIGINS (phân cách dấu phẩy), không có thì lấy CLIENT_ORIGIN */
  get clientOrigins() {
    return (process.env.CLIENT_ORIGINS || this.clientOrigin)
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  },
};

export default appConfig;
