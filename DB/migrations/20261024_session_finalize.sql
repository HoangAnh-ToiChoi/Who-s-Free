-- Migration: Chốt lịch (finalize) cho sessions
-- Date: 2026-10-24
-- Lead chốt 1 khung giờ trong những giờ nhóm đã chọn; sau khi chốt, thành viên không sửa được lịch rảnh.
-- Trạng thái dùng cột status có sẵn ('finalized'); các cột dưới đây lưu khung giờ đã chốt và ghi chú file Excel.

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finalized_date DATE,
  ADD COLUMN IF NOT EXISTS finalized_start_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS finalized_end_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS export_note TEXT;

COMMIT;
