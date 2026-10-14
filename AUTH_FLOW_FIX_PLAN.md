# Plan sửa 5 vấn đề của luồng Authentication/Authorization

## Mục tiêu

Đưa luồng xác thực về một contract duy nhất, không làm mất các thay đổi đang có trong worktree:

- Backend trả `accessToken` trong JSON; FE giữ access token trong memory và gửi `Authorization: Bearer <token>` cho API cần xác thực.
- Backend tiếp tục đặt access và refresh token vào `HttpOnly` cookie theo yêu cầu hiện tại. API thường xác thực bằng Bearer, không dùng access cookie.
- Chỉ endpoint refresh đọc refresh cookie. Sau reload hoặc khi access token hết hạn, FE refresh một lần, cập nhật token trong memory rồi retry request tối đa một lần.
- Refresh token được lưu dạng hash trong DB; DB là nguồn dữ liệu phiên có thẩm quyền.
- Quyền với session/availability được kiểm tra theo người dùng và tài nguyên ở backend.

## Hiện trạng cần xử lý

1. FE có nhiều API client và nhiều chỗ điều phối refresh/retry: `authService`, `backendApi`, `http.js`.
2. `authService.getMe()` chỉ refresh khi memory chưa có token; nếu token đang có nhưng hết hạn, `/me` trả 401 và FE xóa phiên thay vì refresh.
3. Backend `authenticate` và `optionalAuth` tự đọc/verify Bearer riêng, với quy tắc `token_type` không giống nhau.
4. Model bắt lỗi DB khi upsert user/lưu refresh token rồi dùng fallback memory; login có thể thành công dù DB chưa lưu được phiên. Việc cập nhật profile và lưu refresh token là hai nhiệm vụ khác nhau, không được xóa bước persist refresh.
5. Session/availability routes yêu cầu đăng nhập, nhưng controller chưa truyền actor `req.user` tới service để kiểm tra quyền trên tài nguyên.

## Kế hoạch triển khai

### Phase 1 — Chốt contract và gom API client FE

Các khu vực chính: `FE/src/utils/backendApi.js`, `FE/src/utils/http.js`, `FE/src/utils/tokenManager.js`, `FE/src/service/authService/authService.js`, `FE/src/contexts/AuthContext.jsx`.

1. Chọn một API client duy nhất làm nơi xử lý Bearer header, base URL, credentials, parse response/error và refresh/retry.
2. Chuyển các service đang dùng `http.js` hoặc `backendRequest` sang client chung; auth service dùng cùng client cho `/me` và `/refresh` thay vì tự có cơ chế refresh riêng.
3. Dùng một `refreshInFlight` Promise dùng chung. Khi nhiều request đồng thời bị 401, chỉ gửi một refresh request; các request chờ cùng kết quả.
4. Refresh request gửi cookie bằng credentials. API thường gửi Bearer token và không dựa vào cookie. Cập nhật token mới vào `tokenManager` trong memory.
5. Retry request gốc tối đa một lần. Không refresh lại endpoint login/register/refresh; refresh thất bại thì xóa token memory và user cache.
6. Luồng khởi động: nếu chưa có access token trong memory, gọi refresh bằng cookie rồi gọi `/me`. Nếu token đang có nhưng API trả 401, API client refresh rồi retry `/me`.
7. Rà `AuthContext` để các luồng init/login/register/Google/fetchMe dùng chung cách xác minh và cập nhật user. Giữ `/me` sau đăng nhập nếu cần xác nhận session, nhưng tránh gọi lặp ngoài ý muốn.

### Phase 2 — Chuẩn hóa JWT verification ở backend

Các khu vực chính: `BE/src/middlewares/auth.middleware.js`, `BE/src/services/token.service.js`, `BE/src/routes/auth.routes.js`.

1. Tạo helper chung để parse `Authorization: Bearer` và verify app access token; dùng helper đó trong cả `authenticate` và `optionalAuth`.
2. Chỉ verify bằng secret nội bộ, với danh sách thuật toán cho phép được chỉ định tường minh. Bắt buộc `token_type === "access"`, `sub` hợp lệ và hạn `exp` còn hiệu lực.
3. Nếu thêm `iss` và `aud`, thêm đồng thời vào lúc ký và kiểm tra lúc verify; không bật kiểm tra claim mà token phát hành chưa có.
4. Không fallback sang access cookie hoặc Supabase SDK khi token không hợp lệ. Supabase vẫn được dùng riêng cho đăng nhập/trao đổi danh tính OAuth.
5. Định nghĩa rõ `optionalAuth`: không có Bearer thì anonymous; nếu có Bearer sai thì chọn nhất quán giữa trả 401 hoặc tiếp tục anonymous, không để hai middleware có quy tắc ngầm khác nhau.
6. Giữ `/api/auth/me` chỉ xác thực Bearer và trả user; refresh do FE/API client gọi qua `/api/auth/refresh`.

### Phase 3 — DB persistence và refresh rotation an toàn

Các khu vực chính: `BE/src/services/auth.service.js`, `BE/src/models/user.model.js`, `BE/src/services/token.service.js`, `DB/schema.sql` nếu cần migration.

1. Giữ luồng phát hành token dùng chung trong `AuthService.#issueSession`; login/register/OAuth/refresh tiếp tục dùng cùng entry point.
2. Đảm bảo hash refresh token được ghi vào DB thành công trước khi trả response thành công hoặc gửi cookie phiên mới. DB lỗi hoặc không tìm thấy user row phải làm auth flow thất bại rõ ràng.
3. Gỡ fallback in-memory khỏi đường production. Nếu test cần fake store, inject repository/fake riêng thay vì để process memory trở thành nguồn xác thực thay DB.
4. Thực hiện refresh rotation theo compare-and-swap/transaction: cập nhật hash mới chỉ khi hash cũ còn khớp và chưa hết hạn; kiểm tra số dòng cập nhật. Token cũ chỉ được dùng một lần.
5. Có thể hợp nhất đồng bộ profile và lưu refresh session thành một thao tác DB nguyên tử nếu phù hợp với schema. Không bỏ lưu refresh token chỉ vì `upsertToDatabase()` cũng cập nhật cùng bảng.
6. Xác nhận chính sách session: schema hiện tại lưu một refresh token trên mỗi user, nên lần đăng nhập mới có thể ghi đè phiên cũ. Nếu cần nhiều thiết bị/phiên đồng thời, thiết kế bảng session riêng trước khi triển khai.
7. Giữ hash refresh trong DB; không ghi token thô vào log. Khi logout/refresh hết hạn, thu hồi DB session và clear cookie theo cùng Path/Domain/flags lúc set.

### Phase 4 — Authorization session và availability

Các khu vực chính: `BE/src/routes/session.routes.js`, `BE/src/controllers/session.controller.js`, `BE/src/services/session.service.js`, `BE/src/routes/availability.routes.js`, `BE/src/controllers/availability.controller.js`, `BE/src/services/availability.service.js`.

1. Giữ auth middleware ở write routes để chặn anonymous request.
2. Controller truyền `req.user.id` (actor) vào service; không để service nhận payload rồi ghi thẳng mà thiếu danh tính người gọi.
3. Dựa vào schema quan hệ hiện tại để xác định ai sở hữu session, ai là group member và ai có quyền sửa/xóa. Không giả định user id luôn bằng member id.
4. Tạo availability phải xác định member từ actor đã xác thực; bỏ qua/reject `userId` hoặc `memberId` giả mạo trong payload.
5. Update/delete phải tải tài nguyên và kiểm tra owner, group membership hoặc role trước khi ghi. Chỉ trả 404 khi tài nguyên không tồn tại; trả 403 khi tồn tại nhưng actor không có quyền (theo policy API đã chọn).
6. Giữ các GET public chỉ khi dữ liệu được phép công khai; nếu không thì đặt auth và policy tương ứng.

### Phase 5 — OAuth, cookies và hoàn thiện contract

1. Xác nhận OAuth Supabase hiện trả hash token hay authorization code. Giữ đúng flow đang cấu hình; chỉ bỏ nhánh callback còn lại sau khi kiểm tra redirect config và caller.
2. Cả access/refresh cookie vẫn được set `HttpOnly`; access token cho FE dùng đến từ JSON và chỉ giữ trong memory. FE không đọc token từ cookie hoặc localStorage.
3. API thường xác thực bằng Bearer. Refresh là endpoint dùng refresh cookie; kiểm tra Origin theo allowlist và cấu hình CSRF phù hợp với deployment/CORS. `SameSite` chỉ là lớp phòng vệ bổ sung.
4. Chuẩn hóa response auth thành `{ user, accessToken }`; không đưa refresh token vào JSON.

## Tiêu chí hoàn tất

- Chỉ còn một API client FE chịu trách nhiệm gắn Bearer, refresh single-flight và retry một lần.
- `/me` hoạt động cả khi access token hết hạn nhưng refresh cookie còn hợp lệ.
- Cookie-only request tới protected API bị 401; JWT sai chữ ký, sai loại hoặc sai claim bị từ chối; Supabase không cứu app access token sai.
- DB lỗi không tạo login/session thành công giả; hai refresh đồng thời với cùng token cũ không thể cùng thành công.
- Session/availability write kiểm tra cả danh tính lẫn quyền trên đúng tài nguyên; actor id không lấy từ body client.
- Refresh token không nằm trong JSON, localStorage hoặc log; cookie refresh được bảo vệ trước request CSRF theo cấu hình triển khai.
- OAuth flow đang dùng hoạt động qua đúng callback đã cấu hình; nhánh thay thế được giữ hoặc loại bỏ có căn cứ.

## Checklist kiểm chứng sau khi implementation

Thực hiện trong giai đoạn triển khai sau khi người dùng yêu cầu chạy kiểm tra:

- Auth: login/register/Google, `/me` với token hợp lệ/hết hạn/sai chữ ký, cookie-only, refresh thành công/thất bại, logout.
- Đồng thời: nhiều API cùng nhận 401 chỉ kích hoạt một lần refresh; refresh song song với token cũ chỉ có một lần rotate thành công.
- DB: lỗi lưu user/session hoặc lỗi rotate không phát hành phiên thành công.
- Authorization: anonymous bị 401; user A không sửa/xóa session hoặc availability của user/group không thuộc quyền; payload giả mạo member id bị từ chối.
- CSRF: request refresh ngoài Origin được allowlist bị từ chối; request cùng origin hoạt động.
- FE build/lint và backend checks theo script thực tế của repository.

## Tài liệu tham khảo

- [OWASP REST Security Cheat Sheet — JWT validation](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [IETF RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725/)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
