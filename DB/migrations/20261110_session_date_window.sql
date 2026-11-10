-- Khoảng ngày khảo sát do lead tự chọn khi tạo phiên. Phiên cũ để NULL (lưới mở tuần hiện tại như trước).
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_date_window_check;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_date_window_check CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
