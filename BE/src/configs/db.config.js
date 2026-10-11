import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ Warning: DATABASE_URL chưa được cấu hình trong file .env!");
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Lỗi bất ngờ trên PostgreSQL client pool:", err.message);
});

/**
 * Thực thi câu truy vấn SQL an toàn với connection pool
 * @param {string} text
 * @param {any[]} params
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

export default { pool, query };
