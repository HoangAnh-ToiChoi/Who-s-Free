-- Migration: Nhắc hạn 20h và tự đóng session quá hạn
-- Date: 2026-11-15
-- closed_at: lúc session bị tự đóng; reminder_sent_at / closed_notified_at: dấu "đã giành quyền gửi mail"
-- (job UPDATE ... RETURNING nguyên tử nên gọi job nhiều lần không gửi trùng). job_runs: nhật ký mỗi lần chạy job.

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_status_end_date
  ON public.sessions(end_date) WHERE status = 'active_poll';

-- Job quét session đã đóng mà chưa gửi mail: chỉ vài dòng nên index một phần rất nhỏ
CREATE INDEX IF NOT EXISTS idx_sessions_closed_unnotified
  ON public.sessions(id) WHERE status = 'closed' AND closed_notified_at IS NULL;

CREATE TABLE IF NOT EXISTS public.job_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  reminders_sent INT NOT NULL DEFAULT 0,
  sessions_closed INT NOT NULL DEFAULT 0,
  emails_failed INT NOT NULL DEFAULT 0,
  error TEXT
);
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;

COMMIT;
