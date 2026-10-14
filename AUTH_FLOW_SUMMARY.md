# Báo Cáo Chi Tiết: Tối Ưu Hóa & Chuẩn Hóa Luồng Xác Thực (Auth Flow)

Tài liệu này tổng hợp toàn bộ các phân tích, giải pháp kiến trúc và thay đổi mã nguồn đã được thực hiện cho hệ thống xác thực và phân quyền của dự án **Who's Free**.

---

## 1. Mục Tiêu & Yêu Cầu Cốt Lõi

1. **Bảo mật kép cho Token (Memory + HttpOnly Cookie)**:
   - Backend cấp phát cả `access_token` (15 phút) và `refresh_token` (5 ngày) dưới dạng Cookie `HttpOnly`, `SameSite=Lax`.
   - Frontend lưu `accessToken` trong memory (`tokenManager.js`), đính kèm qua header `Authorization: Bearer <token>`.
   - **Tối ưu Network Header theo yêu cầu**: Với tất cả các API tài nguyên thông thường (`/api/sessions`, `/api/groups`, `/api/availabilities`, `/api/auth/me`), request được gửi với `credentials: "omit"`. Nhờ đó, trình duyệt **hoàn toàn không đính kèm header `Cookie:`** khi gửi request tài nguyên, giảm tải overhead và hạn chế lộ cookie header.
   - Chỉ khi gọi `/api/auth/refresh` hoặc `/api/auth/logout`, request mới bật `credentials: "include"` để đọc/xóa refresh cookie.
2. **Khắc phục Database Connection Timeout**:
   - Chuyển `DATABASE_URL` từ direct connection sang IPv4 Connection Pooler (Tokyo region, cổng `6543`), giải quyết triệt để lỗi kết nối timeout khi lưu trữ refresh token vào database.
3. **Refresh Token Rotation (RTR) & Chống Replay / Race Condition**:
   - Sử dụng cơ chế nguyên tử **Compare-and-Swap (CAS)** khi cập nhật refresh token trong database: câu lệnh SQL chỉ thành công nếu token cũ khớp và chưa hết hạn.
   - Token cũ bị hủy ngay lập tức khi phát hành token mới.
4. **Phân Quyền Dựa Trên Định Danh Thực Thể (Actor Authorization)**:
   - Ngăn chặn hoàn toàn việc tin tưởng `userId` hoặc `memberId` do client gửi lên trong request body.
   - Controller trích xuất `req.user.id` (actor đã được xác thực qua JWT) và truyền xuống Service để kiểm tra quyền sở hữu (Creator, Group Owner, Group Lead) trước khi cập nhật hoặc xóa session/availability.
5. **Cơ Chế Khôi Phục Phiên Đồng Bộ Ở Frontend (Single-Flight Refresh)**:
   - Sử dụng hàng đợi Promise dùng chung (`refreshInFlight`). Khi nhiều API gọi đồng thời nhận mã `401 Unauthorized`, hệ thống chỉ phát đi đúng 1 request `/api/auth/refresh`; các request khác chờ kết quả và tự động retry một lần với token mới.
6. **Tùy Chỉnh Console Security Banner**:
   - Tối giản log console trình duyệt: Giữ lại biểu tượng khiên bảo mật với phong cách `Who's Free Security` tông màu tím xanh trực quan, loại bỏ các log thừa không cần thiết.

---

## 2. Chi Tiết Các Hạng Mục Triển Khai

### 2.1. Backend (`BE/`)

| Khu Vực / Tệp Tin | Mô Tả Thay Đổi |
| :--- | :--- |
| [`src/services/token.service.js`](file:///D:/WorkSpace/Who'sFree/BE/src/services/token.service.js) | - Chuẩn hóa sinh và xác thực access token HS256 với đầy đủ claims: `issuer` (`whosfree-api`), `audience` (`whosfree-client`), `token_type` (`access`).<br>- Phương thức `setAuthCookies`: Cấp phát cả `access_token` và `refresh_token` vào HttpOnly cookie.<br>- Phương thức `generateResetToken` & `verifyResetToken`: Tạo token đặt lại mật khẩu một lần có `jti` chống tái sử dụng. |
| [`src/models/user.model.js`](file:///D:/WorkSpace/Who'sFree/BE/src/models/user.model.js) | - Triển khai `rotateRefreshToken(userId, oldRefreshToken, newRefreshToken)` dùng CAS (`UPDATE users SET refresh_token = $newHash ... WHERE id = $1 AND (refresh_token = $oldHash OR refresh_token = $oldToken)`).<br>- Lưu hash SHA-256 của refresh token, không lưu plain text.<br>- Lưu cấu trúc thời gian `refresh_token_created_at` để kiểm tra TTL 5 ngày. |
| [`src/services/auth.service.js`](file:///D:/WorkSpace/Who'sFree/BE/src/services/auth.service.js) | - Thống nhất luồng `#issueSession` cho login, register, OAuth Google và refresh.<br>- Triển khai RTR: thu hồi token cũ, cập nhật token mới qua DB model.<br>- Không trả `refreshToken` trong response JSON; chỉ trả `{ user, accessToken }`. |
| [`src/middlewares/auth.middleware.js`](file:///D:/WorkSpace/Who'sFree/BE/src/middlewares/auth.middleware.js) | - Xác thực bắt buộc qua header `Authorization: Bearer <token>`.<br>- Loại bỏ hoàn toàn fallback sang cookie cho các API cần xác thực.<br>- Tách biệt rõ ràng middleware `authenticate` (bắt buộc) và `optionalAuth` (tùy chọn cho public view). |
| [`src/controllers/session.controller.js`](file:///D:/WorkSpace/Who'sFree/BE/src/controllers/session.controller.js)<br>[`src/services/session.service.js`](file:///D:/WorkSpace/Who'sFree/BE/src/services/session.service.js) | - Truyền `req.user.id` (actor) vào hàm tạo và xóa session.<br>- `deleteSession`: Kiểm tra người yêu cầu phải là người tạo session hoặc có vai trò `owner`/`lead` trong group; nếu không, trả mã lỗi `403 FORBIDDEN`. |
| [`src/controllers/availability.controller.js`](file:///D:/WorkSpace/Who'sFree/BE/src/controllers/availability.controller.js)<br>[`src/services/availability.service.js`](file:///D:/WorkSpace/Who'sFree/BE/src/services/availability.service.js) | - `createAvailability`: Gán `userId` trực tiếp từ actor, chặn hành vi mạo danh user khác.<br>- `updateAvailability`: Tải slot từ DB và xác thực actor là chủ sở hữu trước khi cập nhật. |
| `BE/.env` | - Cập nhật `DATABASE_URL` trỏ về IPv4 Supabase Connection Pooler (`aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`). |

---

### 2.2. Frontend (`FE/`)

| Khu Vực / Tệp Tin | Mô Tả Thay Đổi |
| :--- | :--- |
| [`src/utils/tokenManager.js`](file:///D:/WorkSpace/Who'sFree/FE/src/utils/tokenManager.js) | - Quản lý `accessToken` hoàn toàn trong biến memory cục bộ.<br>- Cung cấp các phương thức an toàn: `getAccessToken()`, `setAccessToken()`, `clearAccessToken()`. |
| [`src/utils/backendApi.js`](file:///D:/WorkSpace/Who'sFree/FE/src/utils/backendApi.js) | - Cấu hình mặc định `credentials: "omit"` cho mọi request tài nguyên thông thường kèm `Authorization: Bearer <accessToken>`.<br>- Khi gặp lỗi `401 Unauthorized`: Kích hoạt cơ chế refresh single-flight (`requestTokenRefresh`), đính kèm cookie (`credentials: "include"`), lưu token mới vào `tokenManager` và tự động retry request ban đầu tối đa 1 lần. |
| [`src/utils/http.js`](file:///D:/WorkSpace/Who'sFree/FE/src/utils/http.js) | - Chuyển tiếp toàn bộ các phương thức gọi HTTP (`get`, `post`, `put`, `patch`, `delete`) sang `backendRequest` để đồng nhất cơ chế xác thực và refresh. |
| [`src/service/authService/authService.js`](file:///D:/WorkSpace/Who'sFree/FE/src/service/authService/authService.js) | - `getMe()` chuyển sang dùng `backendRequest("/auth/me")`.<br>- Tự động phối hợp với cơ chế refresh khi token memory hết hạn. |
| [`src/contexts/AuthContext.jsx`](file:///D:/WorkSpace/Who'sFree/FE/src/contexts/AuthContext.jsx) | - Luồng khởi động ứng dụng: Gọi refresh token bằng HttpOnly cookie trước, sau đó nạp profile người dùng qua `/me`. |
| [`src/utils/securityBanner.js`](file:///D:/WorkSpace/Who'sFree/FE/src/utils/securityBanner.js) | - Hiển thị banner bảo mật `Who's Free Security` tông màu tím xanh trực quan trên dev console. |

---

### 2.3. Kiểm Thử Hệ Thống (Tests)

| Tệp Kiểm Thử | Nội Dung Đã Chuẩn Hóa |
| :--- | :--- |
| [`BE/tests/auth.integration.test.js`](file:///D:/WorkSpace/Who'sFree/BE/tests/auth.integration.test.js) | - Cập nhật `validAccessToken()` đồng bộ claims `iss`, `aud`, `HS256`.<br>- Cập nhật luồng đặt lại mật khẩu sử dụng `TokenService.generateResetToken` với `jti`. |
| [`BE/tests/auth.refactor.test.js`](file:///D:/WorkSpace/Who'sFree/BE/tests/auth.refactor.test.js) | - Cập nhật `validBearer()` tích hợp claims chuẩn hóa.<br>- Kiểm tra nghiêm ngặt 10 quy tắc bảo mật xác thực (C1 -> C10). |
| [`BE/tests/token.service.test.js`](file:///D:/WorkSpace/Who'sFree/BE/tests/token.service.test.js) | - Kiểm tra unit tests cho các phương thức của `TokenService` (sinh token, kiểm tra hạn, TTL, cookie options). |

---

## 3. Kết Quả Xác Nhận (Verification)

### 3.1. Backend Tests (Node Test Runner)
Chạy lệnh kiểm thử tích hợp và kiểm thử hồi quy:
```bash
node --test tests/auth.refactor.test.js tests/auth.integration.test.js tests/token.service.test.js
```
- **Tổng số tests**: 63
- **Passed**: 63 (100%)
- **Failed**: 0
- **Thời gian hoàn thành**: ~36.4s

### 3.2. Frontend Build (Vite)
Chạy lệnh đóng gói mã nguồn:
```bash
npm run build
```
- **Kết quả**: Đóng gói thành công toàn bộ `2285` modules trong 10.46s không có bất kỳ cảnh báo lỗi cấu trúc hay import nào.

---

## 4. Tóm Tắt Contract API Mới

```mermaid
sequenceDiagram
    autonumber
    actor Client as Trình Duyệt / Ứng Dụng
    participant FE as Frontend (tokenManager)
    participant BE as Backend API
    participant DB as Supabase PostgreSQL

    Note over Client,FE: 1. Khởi tạo / Đăng nhập
    Client->>BE: POST /api/auth/login (body: { email, password })
    BE->>DB: Kiểm tra thông tin & lưu SHA-256(refreshToken)
    BE-->>Client: Set-Cookie: access_token=...; refresh_token=... (HttpOnly)<br>Body: { user, accessToken }
    Client->>FE: Lưu accessToken vào Memory

    Note over Client,BE: 2. Gọi API Tài Nguyên Thông Thường
    Client->>BE: GET /api/sessions (Header: Authorization: Bearer <accessToken>, credentials: omit)
    Note over Client,BE: (Header hoàn toàn KHÔNG có Cookie)
    BE-->>Client: Trả dữ liệu 200 OK

    Note over Client,BE: 3. Khi Access Token Hết Hạn
    Client->>BE: GET /api/sessions (Bearer hết hạn)
    BE-->>Client: 401 Unauthorized
    Client->>BE: POST /api/auth/refresh (credentials: include, Cookie: refresh_token=...)
    BE->>DB: CAS Rotate: Đổi refresh token mới, vô hiệu hóa token cũ
    BE-->>Client: Set-Cookie: refresh_token=new... (HttpOnly)<br>Body: { accessToken: new... }
    FE->>FE: Cập nhật accessToken mới trong Memory
    Client->>BE: Retry GET /api/sessions (Bearer <accessToken mới>, credentials: omit)
    BE-->>Client: Trả dữ liệu 200 OK
```

---

*Tài liệu được tạo tự động bởi Antigravity Agent theo tiêu chuẩn phát triển của dự án Who's Free.*
