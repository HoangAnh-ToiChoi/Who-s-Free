import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import ApiResponse from "./utils/ApiResponse.js";
import apiRoutes from "./routes/index.js";
import { pool } from "./configs/db.config.js";

const app = express();

// Render/Vercel đứng sau reverse proxy: cần để rate limit và req.ip lấy đúng IP client
app.set("trust proxy", 1);

// ─── Allowed Origins (comma-separated CLIENT_ORIGINS or fallback to CLIENT_ORIGIN) ─
const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...allowedOrigins, "https://*.supabase.co"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 15552000, includeSubDomains: true }
      : false,
  }),
);

// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(cookieParser());

// ─── Healthcheck Route ───────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1;");
    return res.json(
      ApiResponse.success(
        { status: "healthy", timestamp: new Date(), dbLatencyMs: Date.now() - start },
        "Who's Free API is running",
      ),
    );
  } catch {
    // In production, a DB outage makes the service unavailable.
    // In other environments, the server is still functional without a DB (e.g., local dev, tests).
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json(
        ApiResponse.error("SERVICE_UNAVAILABLE", "Database không khả dụng"),
      );
    }
    return res.json(
      ApiResponse.success(
        { status: "degraded", timestamp: new Date(), dbLatencyMs: null },
        "Who's Free API is running (database unavailable)",
      ),
    );
  }
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ─── Global 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json(
    ApiResponse.error(
      "ROUTE_NOT_FOUND",
      `Đường dẫn [${req.method}] ${req.originalUrl} không tồn tại`,
    ),
  );
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let errorCode =
    err.errorCode ||
    (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
  let message = err.message || "Đã xảy ra lỗi không xác định";
  let details = err.details || null;

  // 1. Zod Validation
  if (err.name === "ZodError" || err.issues) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    const issues = err.issues || [];
    message = issues[0]?.message || "Dữ liệu yêu cầu không hợp lệ";
    details = issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  // 2. JWT
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    errorCode = "INVALID_TOKEN";
    message = "Mã token xác thực không hợp lệ hoặc đã bị thay đổi";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    errorCode = "TOKEN_EXPIRED";
    message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  // 3. Malformed JSON
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    errorCode = "MALFORMED_JSON";
    message = "Cú pháp JSON trong request body không hợp lệ";
  }

  // 4. PostgreSQL error codes
  if (err.code === "23505") {
    statusCode = 409;
    errorCode = "RESOURCE_ALREADY_EXISTS";
    message = "Dữ liệu đã tồn tại trong hệ thống";
  } else if (err.code === "23503") {
    statusCode = 400;
    errorCode = "INVALID_REFERENCE";
    message = "Dữ liệu liên kết không tồn tại hoặc không hợp lệ";
  } else if (err.code === "22P02") {
    statusCode = 400;
    errorCode = "INVALID_DATA_FORMAT";
    message = "Định dạng dữ liệu không hợp lệ";
  }

  // 5. Protect internals in production
  if (statusCode >= 500) {
    console.error("🔥 [INTERNAL SERVER ERROR]:", err);
    if (process.env.NODE_ENV === "production") {
      message = "Lỗi hệ thống nội bộ. Vui lòng thử lại sau.";
      details = null;
    }
  }

  res.status(statusCode).json(ApiResponse.error(errorCode, message, details));
});

export default app;
