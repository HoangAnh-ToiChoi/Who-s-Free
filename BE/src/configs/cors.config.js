import { appConfig } from "./app.config.js";

export const allowedOrigins = appConfig.clientOrigins;

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Origin lạ: không gắn header CORS nên trình duyệt tự chặn (không ném lỗi 500)
    callback(null, false);
  },
  credentials: true,
};
