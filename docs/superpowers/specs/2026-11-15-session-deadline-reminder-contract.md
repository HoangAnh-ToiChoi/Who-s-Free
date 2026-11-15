# Contract: nhắc hạn, tự đóng session quá hạn, sửa chuông thông báo, nút copy tin nhắn chốt

Nguồn quyết định: HA đã chốt ngày 2026-11-15. Tài liệu này là hợp đồng chung giữa BE và FE, không agent nào được tự đổi shape. Cần đổi thì dừng và báo lại.

## 1. Hành vi

| # | Hành vi | Chi tiết |
|---|---|---|
| A | Tự đóng | Session `active_poll` có `end_date` < ngày hôm nay (giờ **Asia/Ho_Chi_Minh**) thì chuyển `status='closed'`, set `closed_at`. Gửi email cho **owner + lead** của nhóm. |
| B | Nhắc 20h | 20:00 giờ VN của ngày liền trước `end_date`: gửi email nhắc "ngày mai là ngày cuối" cho **owner + lead**. Chỉ nhắc, không yêu cầu điền gì. Chỉ nhắc session `active_poll`. |
| C | Chuông | Thêm 2 loại thông báo `reminder` và `closed`, chỉ hiện cho owner/lead của nhóm. |
| D | Sau closed | Member **không** lưu lịch được (409). Lead/owner **vẫn chốt được**. |
| E | Gia hạn | Lead đổi `end_date` sang ngày >= hôm nay (VN): session `closed` mở lại thành `active_poll`; mọi session được đổi `end_date` đều reset để được nhắc lại. |
| F | Nút copy | Ở màn Lead: nút "Copy tin nhắn chốt lịch" để dán vào Zalo/Messenger. Chỉ FE. |
| G | Chuông lỗi | Đã sửa nguyên nhân chính (thiếu bảng `group_invitations`). Phần này chỉ cần FE thôi nuốt lỗi im lặng (xem 5). |

Giữ nguyên: người tự chốt lịch **không** thấy thông báo "đã chốt" của chính mình trong chuông.

## 2. DB (BE agent viết file migration, KHÔNG chạy lên production)

File: `DB/migrations/20261115_session_deadline_reminder.sql`, đồng thời cập nhật `DB/schema.sql`.

```sql
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_status_end_date
  ON public.sessions(end_date) WHERE status = 'active_poll';

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
```

## 3. API

### 3.1 Job (BE)
`POST /api/jobs/session-deadlines`

- Header bắt buộc: `x-job-secret: <JOB_SECRET>`. So sánh bằng `crypto.timingSafeEqual`. Thiếu hoặc sai trả 401. Env `JOB_SECRET` chưa cấu hình thì trả 503 (đóng hẳn endpoint). Không đi qua `AuthMiddleware`.
- Response 200: `{ "success": true, "data": { "runId": "uuid", "remindersSent": 0, "sessionsClosed": 0, "emailsFailed": 0 } }`
- Idempotent: gọi liên tục nhiều lần không được gửi email trùng.

Quy tắc chạy (tính theo `Asia/Ho_Chi_Minh` ngay trong SQL):
- **Đóng:** `status='active_poll' AND end_date < today_vn` thì `UPDATE ... SET status='closed', closed_at=NOW() ... RETURNING`.
- **Gửi mail đóng:** giành quyền bằng `UPDATE sessions SET closed_notified_at=NOW() WHERE status='closed' AND closed_notified_at IS NULL RETURNING`. Gửi mail thất bại thì trả `closed_notified_at` về NULL để lần chạy sau thử lại, đồng thời tính vào `emailsFailed`.
- **Nhắc:** `status='active_poll' AND end_date = today_vn + 1 AND reminder_sent_at IS NULL`, chỉ khi giờ VN >= 20:00, và chỉ cho session có `created_at` trước mốc 20:00 hôm nay (session mới tạo sau 20h không bị nhắc ngay). Giành quyền bằng `UPDATE ... SET reminder_sent_at=NOW() ... RETURNING`; gửi thất bại thì reset NULL.
- Ghi 1 dòng `job_runs` mỗi lần chạy (kể cả khi lỗi, trường `error`).
- Người nhận = `group_members.role IN ('owner','lead')` có email. Một session gửi 1 batch (dùng `deliverBatch`).

### 3.2 Session public shape (BE trả, FE đọc)
`status`: `"active_poll" | "finalized" | "closed"`. Thêm trường `closedAt: string|null` (ISO). Các trường khác giữ nguyên.

### 3.3 Lưu lịch khi closed (BE)
`PUT` lưu availability trên session `closed` trả **409**:
```json
{ "success": false, "error": "SESSION_CLOSED", "message": "...",
  "details": { "status": "closed", "slots": [ ...slot thật của user... ] } }
```
Thêm `SESSION_CLOSED` vào `BE/src/constants/errorCodes.js`. Phải chặn ở cả `availability.service.js` lẫn transaction trong `availability.model.js` (chống race).

### 3.4 Chốt và gia hạn (BE)
- `finalizeSession`, `startFinalizing`, export: cho phép khi `status='closed'` (hiện đã chạy được, chỉ cần có test khoá lại).
- `updateSession` khi đổi `end_date`: đặt `reminder_sent_at=NULL`. Nếu session đang `closed` và `end_date` mới >= today_vn thì đặt `status='active_poll'`, `closed_at=NULL`, `closed_notified_at=NULL`.

### 3.5 Notifications (BE)
`GET /api/notifications` giữ nguyên shape bao ngoài `{ items, unreadCount }`. Thêm 2 loại item (chỉ cho owner/lead của nhóm):

```json
{ "id": "reminder:<sessionId>", "type": "reminder", "createdAt": "<reminder_sent_at>",
  "groupName": "…", "sessionTitle": "…", "endDate": "YYYY-MM-DD",
  "link": "/groups/<groupId>/matrix/<slug>", "unread": true }

{ "id": "closed:<sessionId>", "type": "closed", "createdAt": "<closed_at>",
  "groupName": "…", "sessionTitle": "…",
  "link": "/groups/<groupId>/matrix/<slug>", "unread": true }
```
- `reminder`: hiện khi session còn `active_poll` và `reminder_sent_at` không null và `end_date >= today_vn`.
- `closed`: hiện khi `status='closed'` và `closed_at` trong 14 ngày gần nhất.
- Mỗi query 1 round trip, chạy song song trong `Promise.all` cùng các query cũ, `LIMIT` 30, chọn cột cụ thể.
- **Một nguồn lỗi không được làm sập cả API thông báo:** nếu một nhóm query lỗi thì ghi log lỗi (có tên query) rồi vẫn trả các nhóm còn lại. Đây là bài học từ lỗi thiếu bảng `group_invitations`.

## 4. FE

- Session `closed`: badge "Đã đóng" (màu xám/cam), khoá lưới điền của member (như đã chốt nhưng text khác), thông báo "Phiên đã quá hạn, liên hệ trưởng nhóm". Lead/owner vẫn thấy nút Chốt lịch.
- Xử lý 409 `SESSION_CLOSED` giống cách đang xử lý `SESSION_FINALIZED` (khớp lại slot thật, chuyển màn).
- Chuông: render 2 type mới `reminder` ("Ngày mai là ngày cuối của lịch {title}") và `closed` ("Lịch {title} đã đóng vì quá hạn, chưa được chốt"), bấm vào đi tới `link`.
- **Chuông không được nuốt lỗi im lặng:** `useNotifications` hiện `catch {}` rỗng. Giữ việc không làm phiền user bằng toast, nhưng phải có state `error` để UI có thể hiện dấu hiệu, và `console.warn` đúng 1 lần mỗi lần chuyển từ ổn sang lỗi (không spam theo nhịp polling 30 giây).
- Nút copy ở màn Lead (`FE/src/pages/LeadMatrix`): tin nhắn dạng
  `Lịch "<title>": khung giờ nhiều người rảnh nhất là <Thứ, dd/mm> <HH:mm–HH:mm> (<n>/<total> người rảnh). Chốt tại: <link>`
  Dùng logic tính trùng lịch đã có ở FE, không viết lại. Có toast/nhãn "Đã copy". Dự phòng khi `navigator.clipboard` không có.
- i18n: thêm đủ key ở `FE/src/locales/vi` và `en`.

## 5. Ràng buộc chung (CLAUDE.md)

File budget, không `SELECT *`, không N+1, không `console.log`, auth guard, unit test cho service mới, không unused import. Commit theo `feat|fix|refactor(scope): mô tả`.

## 6. Phân việc

- **BE agent:** nhánh `feature/be-session-deadline`. Migration, model, service, controller, route, email, notification, unit test trong `BE/tests/unit/`.
- **FE agent:** nhánh `feature/fe-session-deadline`. Chỉ đụng `FE/`. Dựng mock theo shape ở mục 3 để tự kiểm tra, không đợi BE.
- **Cấm cả hai:** gọi Supabase production (MCP), `git push`, tạo PR.
