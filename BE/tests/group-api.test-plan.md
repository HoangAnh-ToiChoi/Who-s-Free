# Group API Test Cases

## Antigravity: yêu cầu sửa code

Hãy đọc source backend và sửa các lỗi dưới đây. Giữ kiến trúc hiện tại, thêm/cập nhật automated tests tương ứng, không làm thay đổi contract API nếu không cần thiết.

### Quy tắc nghiệp vụ đã chốt

- **Mọi thành viên của nhóm** (`owner`, `lead`, `member`) được xem danh sách thành viên của nhóm đó.
- Người đã đăng nhập nhưng **không thuộc nhóm** không được xem danh sách member.
- Các quyền còn lại theo test cases bên dưới: Owner/Lead cập nhật và thêm member; chỉ Owner xóa nhóm; thao tác xóa member tuân theo ma trận quyền.

### Các việc cần sửa

1. **Bảo vệ `GET /:id/members`:** xác minh caller là thành viên sau khi tìm thấy group; trả `403` cho outsider. Giữ quyền xem cho Owner, Lead và Member.
2. **Sửa fallback của `GET /api/groups`:** kết quả DB rỗng phải trả `[]`, không lấy toàn bộ in-memory store hoặc gán role giả. Lỗi DB phải được xử lý như lỗi DB, không biến thành danh sách thành công sai dữ liệu.
3. **Không nuốt lỗi ghi/xóa DB:** các Model không được giả lập thành công bằng in-memory store khi thao tác DB production thất bại. API xóa nhóm phải báo lỗi nếu DB chưa xóa được.
4. **Ngăn race condition khi thêm member:** duplicate phải trả conflict, không cập nhật role của membership đang tồn tại. Kiểm tra capacity và insert phải đảm bảo không vượt giới hạn khi nhiều request đồng thời.
5. **Đảm bảo tạo nhóm nguyên tử:** tạo group và membership Owner phải cùng transaction; nếu một bước lỗi thì rollback cả hai.
6. **Validation cập nhật:** từ chối body rỗng; không cho sửa field hệ thống; không cho giảm capacity thấp hơn số member hiện tại.
7. **Role promotion:** chỉ cho phép Lead tạo thêm Lead nếu chính sách đó được xác nhận rõ; mặc định không để Lead tự cấp quyền Lead cho người khác. Owner vẫn có thể thêm Lead.
8. **Validation userId:** xác thực định dạng ID trước khi truy vấn; trả lỗi validation nhất quán cho ID sai định dạng.

### Tiêu chí nghiệm thu

- Tất cả test cases trong tài liệu này chạy qua.
- Có test chứng minh Member xem được member list, còn outsider nhận `403`.
- Có test cho DB failure, rollback khi tạo group, duplicate membership, capacity đồng thời và quyền theo vai trò.
- Không còn fallback trả dữ liệu thành công giả khi DB lỗi.
- Chạy `npm test` trong `BE/` và báo lại kết quả cùng các file đã sửa.

Base URL: `/api/groups`  
Auth: `Authorization: Bearer <access-token>`  
Success/error bodies should follow the API response envelope.

## Fixtures

- **Owner A**: owner of Group A.
- **Lead A**: lead of Group A.
- **Member A**: regular member of Group A.
- **Outsider**: authenticated user who is not in Group A.
- **Target**: existing user who is not yet in Group A.
- **Group B**: a separate group, used to check data isolation.

Unless a case says otherwise, use a valid, non-expired bearer token and existing fixture IDs.

## Authentication and authorization

| ID | Request | Expected result |
|---|---|---|
| AUTH-01 | Call each endpoint without `Authorization` | `401`; no group/member data is returned and no mutation occurs. |
| AUTH-02 | Call with malformed `Bearer` header | `401`; no mutation occurs. |
| AUTH-03 | Call with invalid or expired token | `401`; no mutation occurs. |
| AUTH-04 | Send a valid token for an authenticated non-member to `GET /:id/members` | `403`; member list is not disclosed. |

## `POST /api/groups` — create group

| ID | Scenario | Expected result |
|---|---|---|
| CREATE-01 | Create with valid name and omitted optional fields | `201`; defaults are applied; creator appears as `owner` with `leadership` group role. |
| CREATE-02 | Create with every supported field and valid boundary values (`name` 2/100 chars, `capacity` 2/100) | `201`; returned values match normalized input. |
| CREATE-03 | Missing, non-string, blank, 1-character, or >100-character name | `400`; validation error; no group is created. |
| CREATE-04 | Invalid category, non-integer capacity, capacity <2 or >100, description >500 chars | `400`; validation error; no group is created. |
| CREATE-05 | Submit unknown/protected fields such as `id`, `createdBy`, or `userRole` | Unknown fields are ignored/rejected; caller cannot choose the owner or privilege fields. |
| CREATE-06 | Create multiple groups with the same name concurrently | Both succeed with distinct slugs, or one receives a documented conflict; no silent overwrite. |
| CREATE-07 | Fail while inserting the creator membership after group insertion | Request fails and the group insert is rolled back; no ownerless group remains. |

## `GET /api/groups` — list caller's groups

| ID | Scenario | Expected result |
|---|---|---|
| LIST-01 | Owner A lists groups | `200`; only groups where Owner A is a member are returned, with correct role/count. |
| LIST-02 | Member belongs to no groups | `200` with an empty array. |
| LIST-03 | User belongs to A and B while another user's group C exists | Only A and B are returned; C and its membership data are not leaked. |
| LIST-04 | Membership roles differ across groups | Each item reports that caller's actual role and group role. |

## `GET /api/groups/:id` — group detail by ID or slug

| ID | Scenario | Expected result |
|---|---|---|
| DETAIL-01 | Fetch by existing UUID | `200`; correct group, member count, and caller role. |
| DETAIL-02 | Fetch by existing slug | `200`; same group as UUID lookup. |
| DETAIL-03 | Fetch unknown UUID/slug | `404 GROUP_NOT_FOUND`. |
| DETAIL-04 | Authenticated non-member fetches a known group | Follow the documented policy: current API description permits authenticated lookup; if group details are private, expect `403` instead. |

## `PATCH /api/groups/:id` — update group

| ID | Scenario | Expected result |
|---|---|---|
| UPDATE-01 | Owner A updates one valid field | `200`; only requested field changes. |
| UPDATE-02 | Lead A updates one valid field | `200`; update succeeds. |
| UPDATE-03 | Member A or Outsider updates | `403`; persisted group remains unchanged. |
| UPDATE-04 | Update a group that does not exist | `404 GROUP_NOT_FOUND`. |
| UPDATE-05 | Send invalid name/category/capacity/description | `400`; no field changes. |
| UPDATE-06 | Send empty body | Return a documented validation error or a no-op; do not report a misleading update. |
| UPDATE-07 | Try to change `id`, `slug`, `created_by`, ownership, or membership fields | Request cannot alter protected fields. |
| UPDATE-08 | Set capacity below the current member count | Reject with a clear conflict/validation error; existing members are not displaced. |

## `DELETE /api/groups/:id` — delete/dissolve group

| ID | Scenario | Expected result |
|---|---|---|
| DELETE-01 | Owner A deletes Group A | `200`; group and dependent memberships are removed (or soft-delete behavior is documented). |
| DELETE-02 | Lead A, Member A, or Outsider deletes Group A | `403`; group and memberships remain unchanged. |
| DELETE-03 | Delete unknown group | `404 GROUP_NOT_FOUND`. |
| DELETE-04 | Database delete fails | `5xx`; response must not claim success and persisted group remains intact. |

## `GET /api/groups/:id/members` — list members

| ID | Scenario | Expected result |
|---|---|---|
| MEMBERS-01 | Owner A, Lead A, or Member A lists Group A members | `200`; all members returned in documented order with public user fields only. |
| MEMBERS-02 | Outsider lists Group A members | `403`; no member PII is returned. |
| MEMBERS-03 | List members for an unknown group | `404 GROUP_NOT_FOUND`. |
| MEMBERS-04 | Member profile is missing/deleted | Endpoint handles the row safely; no crash or sensitive data leakage. |

## `POST /api/groups/:id/members` — add member

| ID | Scenario | Expected result |
|---|---|---|
| ADD-01 | Owner adds an existing user by email | `201`; target is added once with requested/default role. |
| ADD-02 | Lead adds an existing user by `userId` | `201`; target is added once. |
| ADD-03 | Member or Outsider attempts to add a user | `403`; membership count remains unchanged. |
| ADD-04 | No email and no userId, malformed email, or malformed userId | `400`; no membership is created. |
| ADD-05 | Email/userId does not resolve to an existing user | `404 USER_NOT_FOUND`. |
| ADD-06 | Target is already a member | `409 ALREADY_MEMBER`; existing role is unchanged. |
| ADD-07 | Group is at capacity | `400 GROUP_CAPACITY_FULL`; no membership is created. |
| ADD-08 | Add a member when one slot remains | `201`; next addition is rejected at capacity. |
| ADD-09 | Two concurrent additions compete for the final slot | At most one succeeds; final count never exceeds capacity. |
| ADD-10 | Lead requests `role: "lead"` | Enforce the chosen policy: reject unless Leads are explicitly allowed to promote other Leads. |
| ADD-11 | Owner adds a user with invalid role/groupRole | `400`; no membership is created. |

## `DELETE /api/groups/:id/members/:userId` — remove member or leave

| ID | Scenario | Expected result |
|---|---|---|
| REMOVE-01 | Owner removes a regular member | `200`; target is no longer a member. |
| REMOVE-02 | Lead removes a regular member | `200`; target is no longer a member. |
| REMOVE-03 | Member attempts to remove another member | `403`; target remains. |
| REMOVE-04 | Lead attempts to remove Owner | `403 CANNOT_REMOVE_OWNER`; Owner remains. |
| REMOVE-05 | Lead attempts to remove another Lead | `403`; target remains. |
| REMOVE-06 | Owner removes a Lead | `200`; target is no longer a member. |
| REMOVE-07 | Member or Lead removes themselves | `200`; caller is removed. |
| REMOVE-08 | Owner removes themselves before transferring ownership | `400 OWNER_CANNOT_LEAVE`; owner membership remains. |
| REMOVE-09 | Caller is not a member and tries to remove someone | `403`; target remains. |
| REMOVE-10 | Target is not a member | `404 MEMBER_NOT_FOUND`. |
| REMOVE-11 | Group does not exist | `404 GROUP_NOT_FOUND`. |
| REMOVE-12 | Caller removes a member from Group B using Group A's route | `404` or `403`; cross-group membership must not be removed. |

## Post-fix review notes

Static review confirms the code now checks membership before listing members, returns DB query results without the old in-memory fallback, uses transactions for group creation and member additions, rejects duplicate inserts, and propagates database errors. The integration test file includes cases for those behaviors.

Before calling the task fully verified, address these remaining points:

- **Concurrent capacity shrink:** `GroupService.updateGroup` counts members and updates capacity in separate operations. A simultaneous member addition can still make the count exceed the newly lowered capacity. Serialize capacity updates with additions in one transaction/row lock and add a concurrency test.
- **Rollback test quality:** `CREATE-07` mocks `GroupModel.createWithLeader` to throw before any database write. Its subsequent query does not prove that a failed member insert rolls back a group insert. Inject the owner-member insert failure inside the transaction or test the transaction repository with a controlled client.
- **Test database isolation:** `group.integration.test.js` upserts fixture users and deletes groups in `public.groups`. Run it only with a dedicated test database, never the configured Supabase project used by the app.
