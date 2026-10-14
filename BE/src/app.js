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
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse httpOnly cookies từ request
// ─── Security Headers & Content Security Policy (CSP) ───────────────────────
app.use((req, res, next) => {
    // Chống Clickjacking
    res.setHeader("X-Frame-Options", "DENY");
    // Chống MIME-sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Cấm gửi dữ liệu ra domain lạ (Chống tuồn token qua XSS / Console)
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    res.setHeader(
        "Content-Security-Policy",
        `default-src 'self'; connect-src 'self' ${clientOrigin} https://*.supabase.co; frame-ancestors 'none';`
    );
    next();
});

// ─── Healthcheck Route ───────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json(
        ApiResponse.success(
            { status: "healthy", timestamp: new Date() },
            "Who's Free API is running",
        ),
    );
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

// ─── Global Error Handler Tập Trung (Centralized Error Pipeline) ────────────
app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let errorCode =
        err.errorCode ||
        (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
    let message = err.message || "Đã xảy ra lỗi không xác định";
    let details = err.details || null;

    // 1. Xử lý lỗi Zod Validation
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

    // 2. Xử lý lỗi JWT
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        errorCode = "INVALID_TOKEN";
        message = "Mã token xác thực không hợp lệ hoặc đã bị thay đổi";
    } else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        errorCode = "TOKEN_EXPIRED";
        message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }

    // 3. Xử lý lỗi Cú pháp JSON Payload
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        statusCode = 400;
        errorCode = "MALFORMED_JSON";
        message = "Cú pháp JSON trong request body không hợp lệ";
    }

    // 4. Xử lý lỗi Database PostgreSQL / Supabase
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

    // 5. Bảo vệ bảo mật cho lỗi hệ thống nội bộ (5xx)
    if (statusCode >= 500) {
        console.error("🔥 [INTERNAL SERVER ERROR]:", err);
        if (process.env.NODE_ENV === "production") {
            message = "Lỗi hệ thống nội bộ. Vui lòng thử lại sau.";
        }
    }

    // Keep database schema details out of client responses for invitation setup failures.
    if (err.code === "42P01" && /group_invitations/.test(err.message || "")) {
        statusCode = 503;
        errorCode = "INVITATION_FEATURE_NOT_CONFIGURED";
        message = "Tính năng mời thành viên chưa được cấu hình hoàn tất. Vui lòng thử lại sau hoặc báo quản trị viên.";
        details = null;
    }

    res.status(statusCode).json(ApiResponse.error(errorCode, message, details));
});

export default app;
