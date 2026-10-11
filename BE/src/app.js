import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import ApiResponse from "./utils/ApiResponse.js";
import apiRoutes from "./routes/index.js";

const app = express();

// ─── Middlewares cơ bản ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true, // Bắt buộc để cookie cross-origin hoạt động
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse httpOnly cookies từ request
app.use(morgan("dev"));

// ─── Healthcheck Route ───────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json(
    ApiResponse.success(
      { status: "healthy", timestamp: new Date() },
      "Who's Free API is running"
    )
  );
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ─── Global 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json(ApiResponse.error("Route không tồn tại", "Not Found"));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");

  if (statusCode >= 500) {
    console.error("🔥 [SERVER ERROR]:", err);
  }

  res.status(statusCode).json(
    ApiResponse.error(errorCode, err.message || "Lỗi máy chủ nội bộ")
  );
});

export default app;
