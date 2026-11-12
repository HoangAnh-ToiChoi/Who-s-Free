-- Migration: Trạng thái "trưởng nhóm đang chốt lịch"
-- Date: 2026-11-13
-- Khi trưởng nhóm mở bảng Chốt lịch, phiên được đánh dấu đang chốt tới finalizing_until (gia hạn định kỳ khi bảng còn mở).
-- Trong thời gian đó thành viên khác không lưu được lịch rảnh; hết hạn thì tự hết khoá (trưởng nhóm tắt trình duyệt ngang chừng).

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS finalizing_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finalizing_until TIMESTAMPTZ;

COMMIT;
