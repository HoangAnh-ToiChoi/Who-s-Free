# Repository Pattern — Tầng Model

Date: 2026-10-14  
Author: HA

## Bối cảnh

Các file trong `src/models/` đang phình ra vì một model đang làm quá nhiều việc: vừa query DB, vừa transform data, vừa xử lý một số logic không thuộc về DB. Cụ thể:

| File | Dòng | Vấn đề |
|---|---|---|
| `group-invitation.model.js` | 442 | SQL + in-memory store + mapper |
| `user.model.js` | 351 | Supabase auth + public.users CRUD + token ops + cache |
| `group.model.js` | 336 | SQL + mapper |
| `availability.model.js` | 248 | SQL + mapper |
| `group-member.model.js` | 188 | SQL + mapper + capacity check |

## Quyết định

Áp dụng Repository pattern trong kiến trúc MVC hiện có:

- **Model** = một bảng DB, chỉ làm SQL/data ops
- **Mapper** = pure function trong `src/utils/mappers/`, transform raw DB row → public shape
- **Service** = import mapper + gọi model, làm business logic như trước

Không thay đổi kiến trúc tổng thể. Không thêm tầng mới. Không migrate ORM.

## Cấu trúc sau refactor

```
src/
├── models/
│   ├── user.model.js             ← public.users CRUD (profile fields only)
│   ├── token.model.js            ← MỚI: refresh_token ops trên public.users
│   ├── group.model.js            ← SQL thuần, bỏ toPublicGroup
│   ├── group-member.model.js     ← SQL thuần, bỏ toPublicMember
│   ├── group-invitation.model.js ← SQL thuần, bỏ toPublicInvitation
│   ├── supabase-auth.model.js    ← không đổi
│   ├── otp.model.js              ← không đổi (in-memory)
│   ├── session.model.js          ← bỏ toPublicSession (mock data)
│   ├── availability.model.js     ← bỏ toPublicAvailability (mock data)
│   └── member.model.js           ← không đổi (mock data)
│
└── utils/
    ├── mappers/
    │   ├── user.mapper.js          ← toPublicUser(rawUser)
    │   ├── group.mapper.js         ← toPublicGroup(rawGroup)
    │   ├── group-member.mapper.js  ← toPublicMember(rawMember)
    │   ├── invitation.mapper.js    ← toPublicInvitation(rawInv)
    │   ├── session.mapper.js       ← toPublicSession(rawSession)
    │   └── availability.mapper.js  ← toPublicAvailability(rawAvail)
    └── ...existing utils
```

## Phân chia responsibility

### `user.model.js` (sau tách)

Chỉ làm việc với profile fields của `public.users`:

```
findById(userId)
findByEmail(email)
upsertToDatabase({ id, email, fullName, avatarUrl })
syncAuthUser(authUser, options)
createInAuth({ email, password, fullName })
signInWithPassword({ email, password })
getGoogleOAuthUrl(redirectTo)
exchangeCodeForSession(code)
getUserFromToken(accessToken)
updatePassword(userId, newPassword)
_inMemoryUsers (write-through cache cho test/dev)
```

### `token.model.js` (file mới)

Chỉ làm việc với token columns của `public.users` (`refresh_token`, `refresh_token_created_at`):

```
hashToken(token)
updateRefreshToken(userId, refreshToken)
rotateRefreshToken(userId, oldToken, newToken)   ← CAS
findByRefreshToken(refreshToken)
clearRefreshToken(userId)
_inMemoryTokens (write-through cache cho test/dev)
pruneExpiredTokenCache()
```

### Mappers trong `src/utils/mappers/`

Pure functions — không import gì ngoài kiểu dữ liệu, không có side effects:

```js
// user.mapper.js
export function toPublicUser(rawUser) { ... }

// group.mapper.js
export function toPublicGroup(rawGroup) { ... }

// group-member.mapper.js
export function toPublicMember(rawMember) { ... }

// invitation.mapper.js
export function toPublicInvitation(rawInv) { ... }
```

### Services cập nhật

Services import mapper từ `utils/mappers/` và gọi model tương ứng:

```js
// auth.service.js — dùng TokenModel thay vì UserModel cho token ops
import TokenModel from "../models/token.model.js";
import { toPublicUser } from "../utils/mappers/user.mapper.js";

// group.service.js
import { toPublicGroup } from "../utils/mappers/group.mapper.js";

// group-member.service.js
import { toPublicMember } from "../utils/mappers/group-member.mapper.js";
```

## Trường hợp đặc biệt

### `addMemberWithCapacityCheck` trong `group-member.model.js`

Hàm này có capacity check (business logic) nhưng **nằm trong DB transaction với `FOR UPDATE` row-level lock**. Tách ra service sẽ phá vỡ atomicity. Giữ nguyên trong model, comment rõ lý do.

### Mock data models (`session.model.js`, `availability.model.js`)

Vẫn là in-memory mock, chưa kết nối DB thật. Chỉ extract mapper ra `utils/mappers/`, không thay đổi gì khác.

## Tiêu chí hoàn thành

- [ ] Tất cả `toPublicX` đã chuyển sang `src/utils/mappers/`
- [ ] `token.model.js` tách khỏi `user.model.js`
- [ ] `auth.service.js` dùng `TokenModel` cho token ops
- [ ] Tất cả services import mapper từ `utils/mappers/`
- [ ] Không có model nào còn chứa `toPublicX`
- [ ] 25/25 auth integration tests vẫn pass
- [ ] Không có import nào bị vỡ
