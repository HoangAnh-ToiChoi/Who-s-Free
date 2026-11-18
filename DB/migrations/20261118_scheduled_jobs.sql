-- Job định kỳ dùng chung bảng job_runs: thêm cột stats (JSONB) cho số liệu riêng của từng job
-- (session-deadlines vẫn dùng các cột reminders_sent / sessions_closed / emails_failed sẵn có).
-- email_verifications: xoá tài khoản chưa xác thực thì GIỮ nhật ký gửi mã (user_id về NULL) thay vì xoá theo.

BEGIN;

ALTER TABLE public.job_runs ADD COLUMN IF NOT EXISTS stats JSONB;

CREATE INDEX IF NOT EXISTS idx_job_runs_name_started
  ON public.job_runs(job_name, started_at DESC);

ALTER TABLE public.email_verifications ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.email_verifications DROP CONSTRAINT IF EXISTS email_verifications_user_id_fkey;
ALTER TABLE public.email_verifications
  ADD CONSTRAINT email_verifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Job dọn OTP lọc theo sent_at trên các dòng còn giữ mã băm
CREATE INDEX IF NOT EXISTS idx_email_verifications_hash_sent
  ON public.email_verifications(sent_at) WHERE otp_hash IS NOT NULL;

COMMIT;
