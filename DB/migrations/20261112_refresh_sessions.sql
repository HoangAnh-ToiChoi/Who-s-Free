-- Migration: Đăng nhập nhiều thiết bị (refresh_sessions)
-- Date: 2026-11-12
-- Mỗi dòng là một thiết bị đang đăng nhập. Mỗi tài khoản giữ tối đa 1 phiên cho mỗi loại thiết bị
-- (điện thoại / máy tính bảng / máy tính): đăng nhập trên thiết bị cùng loại thì phiên cũ bị thay thế.
-- Token chỉ lưu dạng SHA-256. Hạn 15 ngày tính từ lần dùng cuối (last_used_at).
-- Bỏ refresh token cũ trên bảng users: mọi người dùng đăng nhập lại một lần sau khi deploy.

BEGIN;

CREATE TABLE IF NOT EXISTS public.refresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_kind VARCHAR(10) NOT NULL CHECK (device_kind IN ('mobile', 'tablet', 'desktop')),
  token_hash TEXT NOT NULL UNIQUE,
  user_agent VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT refresh_sessions_user_device_key UNIQUE (user_id, device_kind)
);

-- Chỉ backend (kết nối Postgres trực tiếp) được truy cập; không có policy nào cho anon/authenticated.
ALTER TABLE public.refresh_sessions ENABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS public.idx_users_refresh_token;
ALTER TABLE public.users
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS refresh_token_created_at;

COMMIT;
