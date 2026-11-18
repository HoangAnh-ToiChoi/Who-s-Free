// CLIENT_ORIGINS (nhiều origin, ngăn cách bằng dấu phẩy) hoặc fallback CLIENT_ORIGIN
export const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Origin lạ: không gắn header CORS nên trình duyệt tự chặn (không ném lỗi 500)
    callback(null, false);
  },
  credentials: true,
};
