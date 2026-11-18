import assert from "node:assert/strict";
import { after, before, test } from "node:test";

// Chạy SQL thật của các job dọn dẹp trên PostgreSQL local (bỏ qua nếu không có DB).
// auth.users ở DB local cần các cột như Supabase: id, email, created_at, email_confirmed_at.
process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const { pool, query } = await import("../src/configs/db.config.js");
const { default: CleanupModel } = await import("../src/models/cleanup.model.js");

let dbAvailable = true;
const USER_OLD = "00000000-0000-4000-8000-00000000e001";
const USER_NEW = "00000000-0000-4000-8000-00000000e002";
const USER_OK = "00000000-0000-4000-8000-00000000e003";
const EMAILS = ["job.old@example.com", "job.new@example.com", "job.ok@example.com"];

async function cleanup() {
  await query("DELETE FROM public.email_verifications WHERE email = ANY($1);", [EMAILS]);
  await query("DELETE FROM public.password_reset_otps WHERE email = ANY($1);", [EMAILS]);
  await query("DELETE FROM public.users WHERE email = ANY($1);", [EMAILS]);
  await query("DELETE FROM auth.users WHERE id = ANY($1);", [[USER_OLD, USER_NEW, USER_OK]]);
}

before(async () => {
  try {
    await query("SELECT 1 FROM public.job_runs LIMIT 1;");
    await query("SELECT stats FROM public.job_runs LIMIT 1;");
  } catch {
    dbAvailable = false;
    return;
  }
  await cleanup();
  await query(
    `INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
       ($1, $4, NOW() - INTERVAL '10 days', NULL),
       ($2, $5, NOW() - INTERVAL '1 day', NULL),
       ($3, $6, NOW() - INTERVAL '10 days', NOW());`,
    [USER_OLD, USER_NEW, USER_OK, ...EMAILS]
  );
  await query(
    `INSERT INTO public.email_verifications (user_id, email, otp_hash, reason, status, sent_at, expires_at) VALUES
       ($1, $4, 'h1', 'register', 'pending', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
       ($2, $5, 'h2', 'register', 'pending', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day'),
       ($3, $6, 'h3', 'register', 'verified', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');`,
    [USER_OLD, USER_NEW, USER_OK, ...EMAILS]
  );
  await query(
    `INSERT INTO public.password_reset_otps (email, otp_hash, attempts, expires_at, created_at) VALUES
       ($1, 'x', 0, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
       ($2, 'y', 0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
     ON CONFLICT (email) DO NOTHING;`,
    [EMAILS[0], EMAILS[1]]
  );
});

after(async () => {
  if (dbAvailable) await cleanup();
  await pool.end();
});

test("dọn OTP quên mật khẩu: chỉ xoá mã hết hạn quá 3 ngày", async (t) => {
  if (!dbAvailable) return t.skip("không có DB");
  assert.equal(await CleanupModel.deleteOldPasswordResetOtps(3) >= 1, true);
  const { rows } = await query("SELECT email FROM public.password_reset_otps WHERE email = ANY($1) ORDER BY email;", [EMAILS]);
  assert.deepEqual(rows.map((r) => r.email), ["job.new@example.com"]);
});

test("dọn mã xác thực email: xoá mã băm cũ hơn 3 ngày nhưng giữ dòng, pending → expired", async (t) => {
  if (!dbAvailable) return t.skip("không có DB");
  await CleanupModel.scrubOldEmailVerificationCodes(3);
  const { rows } = await query(
    "SELECT email, otp_hash, status FROM public.email_verifications WHERE email = ANY($1) ORDER BY email;",
    [EMAILS]
  );
  assert.deepEqual(rows, [
    { email: "job.new@example.com", otp_hash: "h2", status: "pending" },
    { email: "job.ok@example.com", otp_hash: null, status: "verified" },
    { email: "job.old@example.com", otp_hash: null, status: "expired" },
  ]);
});

test("tài khoản chưa xác thực quá 7 ngày: chỉ lấy đúng tài khoản cũ; xoá thì nhật ký vẫn còn", async (t) => {
  if (!dbAvailable) return t.skip("không có DB");
  const stale = await CleanupModel.findStaleUnverifiedAccounts(7);
  assert.deepEqual(stale.filter((a) => EMAILS.includes(a.email)).map((a) => a.id), [USER_OLD]);

  await query("DELETE FROM auth.users WHERE id = $1;", [USER_OLD]);
  const { rows } = await query("SELECT user_id FROM public.email_verifications WHERE email = $1;", [EMAILS[0]]);
  assert.deepEqual(rows, [{ user_id: null }]);
});
