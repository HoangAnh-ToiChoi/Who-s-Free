# WHO'S FREE - BACKEND REST API SPECIFICATION

Tài liệu hợp đồng dữ liệu (API Contract) giữa **Frontend** và **Backend**.
Được thiết kế khớp 100% với giao diện kéo thả lịch, quản lý nhóm và chế độ Trưởng nhóm (Lead Matrix).

---

## 1. QUY CHUẨN CHUNG (GENERAL CONVENTIONS)

- **Base URL:** `http://localhost:5000/api`
- **Content-Type:** `application/json`
- **Chuẩn hóa cấu trúc phản hồi (Response Envelope):**
```json
{
  "success": true,
  "data": {},
  "message": "Thành công",
  "error": null
}
```
- Khi xảy ra lỗi:
```json
{
  "success": false,
  "data": null,
  "message": "Thông báo lỗi thân thiện",
  "error": "Chi tiết mã lỗi hoặc validation errors"
}
```

---

## 2. MODULE AUTHENTICATION & RECOVERY FLOW (XÁC THỰC & QUÊN MẬT KHẨU QUA OTP 6 SỐ)

### 2.1. Đăng ký tài khoản mới
- **Endpoint:** `POST /api/auth/register`
- **Request Body:** `{ "fullName": "Nguyen Van A", "email": "user@example.com", "password": "password123" }`
- **Response 200:** Trả về đối tượng user và yêu cầu xác nhận email.

### 2.2. Đăng nhập
- **Endpoint:** `POST /api/auth/login`
- **Request Body:** `{ "email": "user@example.com", "password": "password123" }`
- **Response 200:** Cấp `accessToken` và set httpOnly cookie `access_token`.

### 2.3. Yêu cầu gửi mã OTP quên mật khẩu (Forgot Password)
- **Endpoint:** `POST /api/auth/forgot-password`
- **Mô tả:** Hệ thống sinh mã OTP ngẫu nhiên gồm đúng **6 chữ số** (thời hạn 10 phút), lưu hash an toàn và gửi về email người dùng.
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response 200:**
```json
{
  "success": true,
  "data": { "email": "user@example.com", "expiresInSeconds": 600 },
  "message": "Mã xác thực OTP gồm 6 chữ số đã được gửi tới email của bạn",
  "error": null
}
```

### 2.4. Xác thực mã OTP 6 số (Verify OTP)
- **Endpoint:** `POST /api/auth/verify-otp`
- **Mô tả:** Kiểm tra mã 6 chữ số người dùng nhập. Nếu chính xác và chưa hết hạn, hệ thống cấp một `resetToken` dùng một lần (One-Time Token, thời hạn 15 phút) để mở khóa quyền đổi mật khẩu.
- **Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "489201"
}
```
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "resetToken": "signed-jwt-or-opaque-reset-token-sample"
  },
  "message": "Xác thực mã OTP thành công. Cho phép đặt lại mật khẩu.",
  "error": null
}
```

### 2.5. Đặt lại mật khẩu mới (Reset Password với 2 trường mật khẩu)
- **Endpoint:** `POST /api/auth/reset-password`
- **Mô tả:** Nhận `resetToken` đã được cấp từ bước Verify OTP cùng 2 trường `password` và `confirmPassword`. Sau khi cập nhật, thu hồi `resetToken` ngay lập tức để chống replay attack.
- **Request Body:**
```json
{
  "email": "user@example.com",
  "resetToken": "signed-jwt-or-opaque-reset-token-sample",
  "password": "NewStrongPassword@2026",
  "confirmPassword": "NewStrongPassword@2026"
}
```
- **Response 200:**
```json
{
  "success": true,
  "data": null,
  "message": "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
  "error": null
}
```

---

## 3. MODULE GROUPS (QUẢN LÝ NHÓM / WORKSPACE)

### 2.1. Lấy danh sách nhóm của người dùng
- **Endpoint:** `GET /api/groups`
- **Query Params:**
  - `search` (string): Tìm theo tên hoặc mô tả
  - `filter` (string): `all` | `owner` | `joined`
- **Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-group-1",
      "slug": "do-an-tot-nghiep--uuid-1",
      "name": "Đồ án tốt nghiệp",
      "category": "work",
      "description": "Không gian chạy đồ án kỳ 2026",
      "icon": "BookOpen",
      "color": "indigo",
      "role": "Owner",
      "memberCount": 5,
      "capacity": 10,
      "cohort": "2026",
      "activeSessionsCount": 2,
      "avatarPreviews": [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
      ]
    }
  ]
}
```

### 2.2. Lấy chi tiết nhóm theo ID hoặc Slug
- **Endpoint:** `GET /api/groups/:idOrSlug`
- **Response 200:** Trả về đối tượng Group đầy đủ thông tin kèm danh sách `sessions` và `members`.

### 2.3. Tạo nhóm mới
- **Endpoint:** `POST /api/groups`
- **Request Body:**
```json
{
  "name": "Họp Ban Truyền Thông",
  "category": "work",
  "description": "Nhóm lập kế hoạch truyền thông sự kiện tháng 10",
  "color": "indigo",
  "icon": "Users",
  "capacity": 15,
  "cohort": "2026"
}
```
- **Backend Service Logic:**
  - Tự động sinh `slug` chuẩn URL: `createCompositeSlug(name, id)`.
  - Tự động gán người tạo làm `role = 'owner'` trong bảng `group_members` (Quan hệ N-N).

### 2.4. Danh sách thành viên nhóm
- **Endpoint:** `GET /api/groups/:id/members`
- **Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-user-1",
      "name": "Maya Lin",
      "email": "maya@whosfree.com",
      "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      "role": "Owner",
      "groupRole": "leadership",
      "joinedAt": "2026-09-01T08:00:00Z"
    }
  ]
}
```

### 2.5. Tạo mã mời tham gia nhóm
- **Endpoint:** `POST /api/groups/:id/invites`
- **Request Body:** `{ "email": "thanhvien@gmail.com", "role": "member" }`
- **Response 200:** Trả về `inviteCode` và link mời đầy đủ.

---

## 3. MODULE SESSIONS (PHIÊN KHẢO SÁT LỊCH HỌP)

### 3.1. Lấy danh sách sessions của nhóm
- **Endpoint:** `GET /api/groups/:groupId/sessions`
- **Response 200:** Trả về danh sách session kèm các metrics tính sẵn (`respondedCount`, `totalMembers`, `quorumPercent`).

### 3.2. Lấy chi tiết session theo ID hoặc Slug
- **Endpoint:** `GET /api/sessions/:idOrSlug`
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-sess-1",
    "slug": "kickoff-meeting--uuid-sess-1",
    "groupId": "uuid-group-1",
    "groupName": "Đồ án tốt nghiệp",
    "refCode": "Ref #KCK1",
    "title": "Kickoff Meeting",
    "description": "Chốt đề cương và phân công nhiệm vụ",
    "tag": "CÔNG VIỆC & HỌC TẬP",
    "tagColor": "primary",
    "dateRange": "Sep 28 - Oct 4, 2026",
    "scheduledTime": "Flexible Window",
    "location": "Quán Cafe / Trực tuyến",
    "status": "active_poll",
    "totalMembers": 5,
    "respondedCount": 4,
    "quorumPercent": 80
  }
}
```

### 3.3. Tạo session mới trong nhóm
- **Endpoint:** `POST /api/groups/:groupId/sessions`
- **Request Body:**
```json
{
  "title": "Họp Ban Tổ Chức",
  "description": "Khảo sát khung giờ rảnh tuần tới",
  "tag": "CÔNG VIỆC & HỌC TẬP",
  "dateRange": "Oct 12 - Oct 18, 2026",
  "location": "Phòng A201"
}
```

---

## 4. MODULE AVAILABILITY MATRIX (LƯỚI KÉO THẢ THỜI GIAN - TÍNH NĂNG CỐT LÕI)

### 4.1. Lấy lịch rảnh của người dùng hiện tại trong Session
- **Endpoint:** `GET /api/sessions/:sessionId/my-availability`
- **Response 200:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-sess-1",
    "userId": "uuid-user-1",
    "slots": [
      {
        "id": "slot-1791111849061",
        "dayIndex": 3,
        "dateStr": "2026-10-01",
        "startMinutes": 540,
        "endMinutes": 780,
        "label": "Available",
        "note": "Rảnh buổi sáng"
      }
    ]
  }
}
```

### 4.2. Lưu khung giờ rảnh sau khi kéo thả (Atomic Replace)
- **Endpoint:** `PUT /api/sessions/:sessionId/my-availability`
- **Mô tả:** Ghi đè toàn bộ danh sách `slots` của người dùng trong phiên này (Xóa slot cũ trong DB và chèn mảng slots mới).
- **Request Body:**
```json
{
  "slots": [
    {
      "dayIndex": 0,
      "dateStr": "2026-09-28",
      "startMinutes": 480,
      "endMinutes": 660,
      "label": "Available",
      "note": ""
    },
    {
      "dayIndex": 3,
      "dateStr": "2026-10-01",
      "startMinutes": 540,
      "endMinutes": 780,
      "label": "Available",
      "note": "Ưu tiên họp sáng"
    }
  ]
}
```
- **Response 200:** `{ "success": true, "message": "Đã lưu lịch rảnh thành công" }`

### 4.3. Lấy dữ liệu tổng hợp cho Trưởng nhóm (Lead Heatmap Matrix)
- **Endpoint:** `GET /api/sessions/:sessionId/availabilities`
- **Query Params:**
  - `roleFilter` (optional): `all` | `leadership` | `core`
- **Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "memberId": "uuid-user-1",
      "memberName": "Maya Lin",
      "role": "Owner",
      "groupRole": "leadership",
      "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      "slots": [
        {
          "dayIndex": 3,
          "dateStr": "2026-10-01",
          "startMinutes": 540,
          "endMinutes": 780
        }
      ]
    }
  ]
}
```

---

## 5. THUẬT TOÁN ĐO TOẠ ĐỘ PHÚT CẦN LƯU Ý
- Mỗi ngày chia từ `0:00` đến `24:00` = `0` đến `1440` phút.
- Mỗi block nhỏ trên giao diện kéo thả tương ứng **30 phút** (`30`, `60`, `90`...).
- Slot có `startMinutes = 540` nghĩa là `9:00 AM`.
- Slot có `endMinutes = 780` nghĩa là `1:00 PM`.
- Backend khi tính toán Heatmap đếm số thành viên có `startMinutes <= blockStart` và `endMinutes >= blockStart + 30`.

---

## 6. QUY CHUẨN BẢO MẬT & PHÒNG CHỐNG TẤN CÔNG (SECURITY & DEFENSE)

### 6.1. Chống Bypass Trực Tiếp Lên Server (Proxy / Intermediary Gateway)
- **Mô hình Proxy Trung Gian (Reverse Proxy / API Gateway):**
  - Không công khai IP máy chủ gốc (Origin Server). Mọi request từ bên ngoài bắt buộc phải đi qua lớp trung gian (Cloudflare / Nginx / API Gateway).
  - **Cơ chế Internal Shared Secret / HMAC:** Máy chủ backend chỉ chấp nhận các request có kèm header bí mật nội bộ do Proxy trung gian gắn vào (ví dụ: `X-Internal-Gateway-Secret`), từ chối toàn bộ request gọi thẳng vào IP gốc máy chủ (chặn hoàn toàn kỹ thuật bypass proxy/WAF).
- **Backend làm Trung Gian Kiểm Duyệt (BFF Pattern):**
  - Tuyệt đối **không** cho Frontend kết nối trực tiếp đến Supabase Database bằng `SERVICE_ROLE_KEY`.
  - Mọi thao tác ghi dữ liệu nhạy cảm (lưu slot, tạo nhóm, cập nhật quyền, invite) bắt buộc phải đi qua Backend Express làm trung gian xác thực, phân quyền (RBAC) và kiểm tra nghiệp vụ trước khi ghi vào Database.
- **Xác thực Trung Gian đối với Bên Thứ Ba (OAuth & Webhooks):**
  - **Google OAuth:** Sử dụng luồng Authorization Code Server-to-Server. Backend trực tiếp trao đổi mã `code` với Google OAuth API và xác thực chữ ký token, ngăn chặn kẻ tấn công tự sinh ID token giả mạo từ client.
  - **Webhooks:** Xác thực chữ ký bí mật (HMAC SHA256) trên payload của mọi webhook từ bên thứ ba gửi về server trung gian.

### 6.2. Phòng Chống Tấn Công SQL Injection Tuyệt Đối
- **100% Parameterized Queries / Prepared Statements:**
  - **Cấm tuyệt đối** việc nối chuỗi (String Concatenation hoặc Template Strings) để ghép câu SQL:
    - ❌ *Nghiêm cấm:* `supabase.rpc(...)` hoặc raw query dạng `` `SELECT * FROM users WHERE email = '${email}'` ``.
    -  *Bắt buộc:* Sử dụng query builder an toàn của Supabase SDK (`.from('users').select().eq('email', email)`) hoặc biến tham số hóa (`$1`, `$2`, `$3`...).
- **Kiểm Soát Danh Sách Trắng (Whitelist) Cho Tham Số Động:**
  - Với các câu truy vấn có sắp xếp hoặc lọc động (`sortBy`, `sortOrder`, `filterColumn`):
    - Tuyệt đối không đưa trực tiếp input người dùng vào mệnh đề `ORDER BY` hay tên cột.
    - Bắt buộc kiểm tra qua mảng hằng số cho phép (Whitelist), ví dụ: `['created_at', 'name', 'joined_at'].includes(sortBy)`.
- **An Toàn Trong Stored Procedures / RPC:**
  - Các hàm PL/pgSQL trên PostgreSQL phải dùng tham số chuẩn, tránh dùng lệnh `EXECUTE` kèm nối chuỗi nếu không sử dụng hàm định dạng an toàn `format('%I', column_name)` và `USING`.

### 6.3. Kiểm Soát Quyền Truy Cập Đối Tượng (Chống BOLA / IDOR)
- **Cô lập không gian nhóm (Group Workspace Isolation):**
  - Mọi endpoint thao tác trên Session hoặc Group đều phải qua middleware kiểm tra thành viên (`checkGroupMembership`). Người dùng không thuộc nhóm sẽ nhận mã lỗi `403 Forbidden`.
- **Toàn vẹn dữ liệu Lịch rảnh (Slot Integrity):**
  - Endpoint `PUT /api/sessions/:sessionId/my-availability` bắt buộc lấy `userId` từ token đã xác thực (`req.user.id`), không nhận `userId` từ body request. Người dùng chỉ có quyền ghi đè slot của chính mình.

### 6.4. Phòng Vệ Tầng Mạng & Ứng Dụng (Infrastructure Hardening)
- **Bảo vệ HTTP Headers (`helmet`):** Ẩn thông tin công nghệ máy chủ (`X-Powered-By`), chống Clickjacking và MIME-sniffing.
- **Giới Hạn Tần Suất (`express-rate-limit`):** Áp dụng rate limit nghiêm ngặt cho các route nhạy cảm (Auth, Invite, Ma trận tính toán Heatmap) để chống brute-force và DDoS.
- **Chống rò rỉ dữ liệu lỗi (No Leakage in Production):** Tuyệt đối không trả về `stack trace` hoặc lỗi nội bộ của database ra client trong môi trường production.

