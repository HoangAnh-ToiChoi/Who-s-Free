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
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Lỗi bất ngờ trên PostgreSQL client pool:", err.message);
});

/**
 * Pre-warm the PostgreSQL connection pool on startup
 */
export const warmConnectionPool = async () => {
  if (!connectionString) return;
  try {
    const start = Date.now();
    await pool.query("SELECT 1;");
    console.log(`⚡ PostgreSQL connection pool warmed up in ${Date.now() - start}ms`);
  } catch (err) {
    console.warn("⚠️ Pool pre-warm failed:", err.message);
  }
};

/**
 * Thực thi câu truy vấn SQL an toàn với connection pool
 * @param {string} text
 * @param {any[]} params
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Thực thi khối logic trong một transaction PostgreSQL (BEGIN ... COMMIT / ROLLBACK)
 * @template T
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {
      console.warn("Rollback error:", rbErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
};

export default { pool, query, withTransaction };

