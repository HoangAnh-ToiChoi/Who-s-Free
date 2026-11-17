-- Xác thực email cho tài khoản đăng ký bằng email + mật khẩu.
-- Mỗi lần gửi mã là MỘT dòng và không bị xoá, để truy vết: gửi lúc nào, vì sao, từ đâu, kết cục ra sao.
-- Cổng chặn đăng nhập thật vẫn là auth.users.email_confirmed_at (Supabase); bảng này là nhật ký + mã OTP (chỉ lưu HMAC).

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT,
  -- register: vừa đăng ký · login: đăng nhập khi chưa xác thực · resend: bấm gửi lại
  -- oauth / password_reset: xác thực gián tiếp qua Google hoặc OTP quên mật khẩu (không có mã)
  reason TEXT NOT NULL CHECK (reason IN ('register', 'login', 'resend', 'oauth', 'password_reset')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired', 'locked', 'superseded', 'send_failed')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  ip TEXT,
  user_agent TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Giới hạn gửi lại + tìm mã đang chờ: luôn lọc theo email, lấy dòng mới nhất
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_sent
  ON public.email_verifications(email, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON public.email_verifications(user_id);

-- Chỉ BE (kết nối postgres trực tiếp) đọc/ghi; không mở cho anon/authenticated
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

COMMIT;
