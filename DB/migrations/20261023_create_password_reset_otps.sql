-- Migration: Create password_reset_otps table
-- Date: 2026-10-23
-- Lưu OTP quên mật khẩu bền vững (trước đây nằm trong RAM, mất khi Render ngủ/redeploy).
-- OTP chỉ lưu dạng HMAC; hàng bị xóa khi dùng xong, nhập sai quá giới hạn, hết hạn hoặc bị dọn khi có OTP mới.

BEGIN;

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON public.password_reset_otps (expires_at);

-- Chỉ backend (kết nối Postgres trực tiếp) được truy cập; không có policy nào cho anon/authenticated.
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

COMMIT;
