import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import ApiResponse from "./controllers/response.controller.js";
import apiRoutes from "./routes/index.js";
import { pool } from "./configs/db.config.js";
import { corsOptions } from "./configs/cors.config.js";
import { helmetOptions } from "./configs/helmet.config.js";
import errorHandleController from "./controllers/errorHandle.controller.js";
import { appConfig } from "./configs/app.config.js";

const app = express();

// Request production đi qua 2 proxy: Vercel rewrite (/api/*) rồi load balancer của Render.
// Tin đúng 2 hop để req.ip (rate limit, log) là IP người dùng chứ không phải IP của Vercel.
app.set("trust proxy", 2);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet(helmetOptions));

// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(morgan(appConfig.isProduction ? "combined" : "dev"));
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
    if (appConfig.isProduction) {
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

// ─── 404 + Global Error Handler ──────────────────────────────────────────────
app.use(errorHandleController.notFound);
app.use(errorHandleController.handle);

export default app;
