# Design: Group Invite Link Feature

**Ngày:** 2026-10-17  
**Người review:** Claude (Sonnet 4.6)  
**Người thực thi:** Antigravity (Gemini CLI)  
**Nhánh:** `feature/fix-fe-lint` → tách nhánh mới `feature/be-fe-invite-link`

---

## 1. Bối cảnh & vấn đề hiện tại

Hệ thống mời thành viên hiện tại chỉ hoạt động qua email: Lead nhập email → BE gửi email có link → người nhận click → chấp nhận (phải khớp email đăng nhập).

**GroupSettings đã có stub UI "Invite Link"** nhưng đang **broken** — nó tạo link giả `${origin}/invite/${group.slug}` rồi pass slug vào endpoint token-based `/api/invitations/:token`, endpoint này sẽ không tìm thấy gì cả.

Mục tiêu feature này: thêm luồng invite qua link (không cần nhập email), và wire up đúng cái stub UI đó.

---

## 2. Quyết định thiết kế

### 2.1. Không dùng `group_invitations` bảng cũ
Bảng `group_invitations` có toàn bộ logic dựa trên `email` (`revokeActiveByGroupAndEmail`, `findActiveByGroupAndEmail`, `acceptWithMember` check email match). Nhét `email = null` vào đó là refactor rủi ro.

### 2.2. Dùng bảng `group_invite_links` mới (Approach B)
Một row active per group, update-in-place khi reset.

### 2.3. Lưu plain token (không hash)
Khác với email invite (chỉ cần gửi đi 1 lần), invite link cần **hiển thị lại** trong GroupSettings. Nếu lưu hash thì không reconstruct được. Plain token vẫn an toàn vì: 32-byte crypto random, hết hạn 24h, mục đích là để share.

### 2.4. URL pattern mới `/join/:token`
Giữ nguyên `/invite/:token` cho email invite. Route mới `/join/:token` tránh ambiguity và không risk break flow cũ.

---

## 3. DB Schema

```sql
CREATE TABLE public.group_invite_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  created_by   UUID NOT NULL REFERENCES public.users(id),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  revoked_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.group_invite_links (group_id);
CREATE INDEX ON public.group_invite_links (token);
```

**Không thêm cột vào bảng `groups`** — giữ groups table tập trung vào group info.

---

## 4. Backend

### 4.1. File mới cần tạo

```
BE/src/
├── models/
│   └── group-invite-link.model.js      ← CRUD + in-memory store (follow pattern của group-invitation.model.js)
├── services/
│   └── group-invite-link.service.js    ← Business logic (giữ < 100 dòng)
├── controllers/
│   └── group-invite-link.controller.js ← 4 actions, mỗi cái 2-5 dòng
└── routes/
    └── join.routes.js                   ← /join/:token endpoints (public preview + authenticated join)
```

File `BE/src/routes/group.routes.js` cần **update thêm** 2 route mới cho generate/get invite link.

### 4.2. API Endpoints

#### `POST /api/groups/:groupId/invite-link` — Tạo / reset link
- **Auth:** Bắt buộc, Lead hoặc Owner
- **Logic:**
  1. Check caller là Lead/Owner trong nhóm
  2. Revoke link cũ: `UPDATE group_invite_links SET revoked_at = NOW(), revoked_by = callerId WHERE group_id = $1 AND revoked_at IS NULL`
  3. Sinh token: `crypto.randomBytes(32).toString('hex')` (64 ký tự hex)
  4. `INSERT INTO group_invite_links (group_id, token, created_by, expires_at)`
  5. Return `{ token, expiresAt, inviteUrl }`
- **Error codes:** `GROUP_NOT_FOUND`, `FORBIDDEN`

#### `GET /api/groups/:groupId/invite-link` — Lấy link hiện tại
- **Auth:** Bắt buộc, Lead hoặc Owner
- **Logic:** `SELECT * FROM group_invite_links WHERE group_id = $1 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`
- **Return:** `{ token, expiresAt, inviteUrl }` hoặc `{ token: null }` nếu không có link active
- **Error codes:** `GROUP_NOT_FOUND`, `FORBIDDEN`

#### `GET /api/join/:token` — Preview link (Public)
- **Auth:** Không bắt buộc
- **Logic:**
  1. `SELECT gil.*, g.name, g.slug, g.description, g.icon, g.color, g.capacity, COUNT(gm.id) as member_count FROM group_invite_links gil JOIN groups g ON ... LEFT JOIN group_members gm ON ... WHERE gil.token = $1`
  2. Check: `revoked_at IS NULL`, `expires_at > NOW()`
  3. Return group info + `{ isExpired, isRevoked, isGroupFull }`
- **Không có email field** — khác hoàn toàn với email invite preview
- **Error codes:** `INVITATION_NOT_FOUND` (dùng lại code cũ cho FE dễ xử lý)

#### `POST /api/join/:token` — Join nhóm
- **Auth:** Bắt buộc (phải đăng nhập)
- **Logic:**
  1. Lookup token (như preview)
  2. Check `revoked_at IS NULL` và `expires_at > NOW()`
  3. Check user chưa là member: `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`
  4. Check capacity: `COUNT(group_members) < group.capacity`
  5. `INSERT INTO group_members (group_id, user_id, role = 'member', group_role = 'core')`
  6. Return `{ member: toPublicMember(...), group: toPublicGroup(...) }`
- **Không có EMAIL_MISMATCH check** — ai đăng nhập hợp lệ đều join được
- **Error codes:** `INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_REVOKED`, `ALREADY_MEMBER`, `GROUP_CAPACITY_FULL`

### 4.3. Mapper mới

```
BE/src/utils/mappers/group-invite-link.mapper.js

export function toPublicInviteLink({ id, group_id, token, expires_at, created_at, group_name, group_slug, ... }) {
  return { id, groupId: group_id, token, expiresAt: expires_at, ... }
}
```

### 4.4. Server.js

Đăng ký route mới trong `BE/src/server.js`:
```javascript
import joinRoutes from './routes/join.routes.js';
app.use('/api/join', joinRoutes);
```

---

## 5. Frontend

### 5.1. Tái sử dụng component từ `pages/Invite/components/`

**Dùng lại trực tiếp — KHÔNG tạo mới, import thẳng:**

| Component | Lý do dùng được |
|---|---|
| `InviteBrandHeader` | Generic, không có gì invite-specific |
| `InviteLoadingState` | Generic spinner, dùng cho Join được |
| `InviteNotFoundCard` | Error card generic, dùng cho Join được |
| `InviteSuccessCard` | Success card sau khi join — y hệt |
| `InviteStatusAlert` | Xử lý `isAlreadyMember`, `isExpired`, `isRevoked`, `isGroupFull` — Join có đủ các state này |

**KHÔNG dùng lại — tạo component mới trong `pages/Join/components/`:**

| Component cũ | Vấn đề | Component mới thay thế |
|---|---|---|
| `InviteGroupCard` | Hard-code section "Người mời" và role badge có nhiều option | `JoinGroupCard` — hiện group info, không có inviter, role luôn "Member" |
| `InviteAcceptAction` | Hiện "Đã xác thực tài khoản: {email}" — Join không check email | `JoinAction` — chỉ hiện nút "Tham gia nhóm" + error nếu có |
| `InviteGuestActions` | Hiện "Lời mời dành riêng cho: {invitedEmail}" — Join không có email cụ thể | `JoinGuestActions` — hiện generic "Đăng nhập để tham gia" + nút Login/Register, returnUrl trỏ về `/join/:token` |
| `InviteMismatchAlert` | Chỉ dành cho email mismatch — **không có trong Join flow** | Không cần tạo |

### 5.2. File mới cần tạo

```
FE/src/
├── pages/
│   └── Join/
│       ├── index.jsx                    ← Page wrapper
│       ├── components/
│       │   ├── JoinGroupCard/index.jsx  ← Group info card (không có inviter, role = Member)
│       │   ├── JoinAction/index.jsx     ← Nút "Tham gia nhóm" (không có email confirm)
│       │   └── JoinGuestActions/index.jsx ← Login/Register buttons, returnUrl = /join/:token
│       └── hooks/
│           └── useJoinPage.js           ← Custom hook (tương tự useInvitePage.js)
└── service/
    └── joinService/
        └── joinService.js               ← getJoinPreview(token), joinGroup(token)
```

### 5.2. Update file hiện có

**`FE/src/pages/Group/subpages/GroupSettings/index.jsx`**
- Bỏ logic tạo link giả (`${origin}/invite/${group.slug}`)
- Thêm `useInviteLink(groupId)` hook để:
  - Gọi `GET /api/groups/:groupId/invite-link` khi mount
  - Hiện link nếu có, hiện "Chưa tạo link" nếu không có
- Button "Tạo link mới":
  - Nếu đã có link active → hiện **AlertDialog cảnh báo**: *"Tạo link mới sẽ vô hiệu hóa link hiện tại ngay lập tức. Tiếp tục?"* → Nút Tạo mới (trái, destructive) / Hủy (phải)
  - Nếu chưa có link → tạo luôn, không cần confirm
- Sau khi tạo: hiện link mới + thời gian hết hạn

**`FE/src/components/AppRoutes.jsx` (hoặc file routing)**  
Thêm route `/join/:token` → `pages/Join`

**`FE/src/locales/vi/translation.json` và `en/translation.json`**  
Thêm tất cả key i18n mới (không hardcode text).

### 5.3. UX: useJoinPage.js — Parallel fetch pattern

```
[mount]
  ├─ fetch GET /api/join/:token   (public, không cần auth)  ─┐ chạy song song
  └─ auth.resolveUser()           (check session)            ┘
                                                              ↓
                                            skeleton card hiện ngay khi mount
                                                              ↓
                               khi cả 2 xong → check membership nếu userId có
                               (1 call riêng, sau khi auth resolved)
                                                              ↓
                                               hiện UI final đúng state
```

**Skeleton:** Hiện skeleton của group card ngay lập tức (trước khi fetch xong), không để trang blank.

**Không gộp membership check vào preview** vì race condition: preview fire trước khi auth resolved → không có userId → `isAlreadyMember = false` dù thực ra đã là member → nút Join hiện sai.

### 5.4. Join page — Các state cần xử lý

| State | Hiển thị |
|-------|----------|
| Loading | Skeleton card |
| Token không tồn tại | Card lỗi "Link không hợp lệ" |
| Token hết hạn | Card lỗi "Link đã hết hạn" |
| Token bị revoke | Card lỗi "Link đã bị vô hiệu hóa" |
| Nhóm đầy | Card lỗi "Nhóm đã đủ thành viên" |
| Chưa đăng nhập | Hiện group info + nút "Đăng nhập để tham gia" |
| Đã là member | Card "Bạn đã là thành viên" + nút vào nhóm |
| Sẵn sàng join | Group card + nút "Tham gia nhóm" |
| Join thành công | Success card + nút vào nhóm |

---

## 6. Các điểm không đụng tới

- `group-invitation.model.js` — không sửa
- `group-invitation.service.js` — không sửa
- Route `/invite/:token` — không sửa
- `group_invitations` table — không sửa

---

## 7. Checklist trước khi bàn giao

- [ ] Migration SQL đã viết và chạy thử
- [ ] 4 BE endpoints hoạt động đúng (test bằng curl hoặc test file)
- [ ] GroupSettings hiện link đúng khi có link active
- [ ] Warning dialog hiện trước khi reset link
- [ ] `/join/:token` redirect login nếu chưa đăng nhập
- [ ] `/join/:token` hiện skeleton khi loading
- [ ] Join thành công → redirect vào nhóm
- [ ] i18n đầy đủ (vi + en)
- [ ] Không còn `console.log` debug
- [ ] Không có import vỡ
