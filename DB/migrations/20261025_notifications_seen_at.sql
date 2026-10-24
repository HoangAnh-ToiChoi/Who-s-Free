-- Migration: Thông báo (chuông) - mốc lần cuối người dùng mở chuông
-- Date: 2026-10-25
-- Thông báo được suy ra từ lời mời nhóm và các lịch đã chốt; chỉ cần lưu thời điểm đã xem để tính số chưa đọc.
-- Người dùng cũ lấy mốc là lúc chạy migration (thông báo trước đó coi như đã đọc).

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notifications_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMIT;
