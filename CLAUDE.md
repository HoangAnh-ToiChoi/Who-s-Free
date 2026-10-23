# CLAUDE.md — Who's Free

## Sản phẩm

Nền tảng điều phối lịch trình nhóm. Member kéo-thả slot rảnh (Weekly 30-min Grid). Lead xem Lead Overlap Matrix để chốt lịch họp.

**Stack:** React + Vite (FE) · Node.js + Express MVC (BE) · Supabase PostgreSQL + Auth + Realtime · Vercel (FE) · Render (BE)

**Không làm trong MVP:** AI/LLM, real-time slot visibility, mobile native, thanh toán, org-level management.

---

## Workflow

### 1. Làm rõ yêu cầu
Mơ hồ → hỏi trước. Rõ → làm luôn.

### 2. Tạo nhánh từ `dev`
```
feature/be-<chức năng>
feature/fe-<chức năng>
feature/fix-<vấn đề>
```

### 3. Xác định track
- BE only / FE only → làm sequential.
- BE + FE độc lập → dùng **Parallel Orchestration** (xem bên dưới).

### 4. Implement
Từng task: viết → self-review → check file budget → test → commit.
Commit format: `feat|fix|refactor|docs(scope): mô tả ngắn`

### 5. Done Checklist *(bắt buộc trước khi báo xong)*
```
□ File budget: file vừa sửa/tạo có vượt ngưỡng? → tách trước
□ N+1: có loop + await lồng? → Promise.all hoặc JOIN
□ Query: có SELECT *? → select() cột cụ thể
□ Auth guard: route mới có requireAuth + role check?
□ BE service mới: có unit test trong tests/unit/?
□ console.log: grep trong file vừa sửa → phải sạch
□ FE: loading + error state đã handle?
□ Index: query mới filter cột lạ → kiểm tra index tồn tại
□ Import: không có unused import
```

### 6. Hỏi HA
Báo kết quả ngắn gọn → "HA muốn push lên GitHub không?" → chờ xác nhận.

---

## Parallel Orchestration

Dùng khi feature chạm cả BE lẫn FE độc lập nhau.

1. **Viết contract** — endpoint, request schema, response shape.
2. **Spawn 2 agent song song** (worktree riêng):
   - BE agent: model → service → controller → route → unit test
   - FE agent: service → hook → component
3. **Review + merge** — chạy integration test.

Không dùng khi: FE phụ thuộc output cụ thể của BE, hoặc bugfix nhỏ.

---

## File Budget *(hard limit — vượt = tách ngay)*

| Layer | Ngưỡng |
|---|---|
| FE component | 200 dòng |
| FE hook | 150 dòng |
| FE service | 200 dòng |
| BE controller | 100 dòng |
| BE service | 200 dòng |
| BE model | 250 dòng |

Cách tách: component fat → extract sub-component + hook · service fat → split queries/mutations · controller fat → `*.helpers.js`

---

## Architecture Boundaries (BE)

```
Request → Controller → Service → Model → DB
```

- **Controller:** parse req, gọi service, trả res. Không business logic, không gọi DB trực tiếp.
- **Service:** business logic. Gọi model. Không gọi DB client trực tiếp.
- **Model:** DB operations. Không business logic.

Vi phạm → refactor trước khi merge.

---

## Code Rules

- Đơn giản trước. Không thêm abstraction khi chưa có ≥3 chỗ dùng.
- Không comment hiển nhiên. Chỉ comment constraint ẩn, workaround, invariant quan trọng.
- Không error handling cho case không thể xảy ra.
- Boy scout rule: file đụng vào → để lại sạch hơn lúc vào.

---

## Query Rules (BE)

- Không `SELECT *` — select() cột cụ thể.
- Không N+1 — dùng JOIN hoặc `Promise.all([...])`.
- Reads song song → `Promise.all`, không await tuần tự.
- Query filter cột mới → kiểm tra index.

---

## BE Test Strategy

```
BE/tests/
  unit/        # pure logic, mock DB — node --test tests/unit/*.test.js
  *.test.js    # integration, hit real DB — node --test tests/*.test.js
```

Mỗi function service mới → unit test tương ứng. Coverage tối thiểu: happy path, invalid input, not found.

---

## Performance (Scale: 100–500 users)

- In-memory cache: group detail 30s/groupId, user profile 60s/userId — dùng Map + TTL.
- Chỉ thêm cache khi có bằng chứng query chậm (> 200ms).
- pg connection pool: max 10 (default đủ cho scale này).

---

## Cấu trúc thư mục

```
Who'sFree/
├── BE/src/
│   ├── configs/       # db.config.js, supabase.config.js
│   ├── constants/     # errorCodes.js
│   ├── controllers/   # thin — parse req → service → res
│   ├── middlewares/   # auth, rateLimit, validate
│   ├── models/        # DB ops only
│   ├── routes/        # route defs + index.js aggregator
│   ├── services/      # business logic only
│   ├── utils/
│   │   └── mappers/   # toPublicX transforms
│   └── validations/
├── FE/src/
│   ├── components/    # Modals, ui/ primitives (shadcn)
│   ├── configs/       # supabase.js (null-safe khi thiếu env)
│   ├── contexts/      # AuthContext, GroupContext
│   ├── hooks/         # useGroupDetail, useSessionsRealtime, ...
│   ├── pages/         # Auth, Group, Home, LeadMatrix, MemberMatrix, Invite, Join
│   ├── service/       # API calls theo domain
│   └── utils/         # http, tokenManager, calculations, dateUtils, ...
└── docs/superpowers/
    ├── specs/         # Design docs
    └── plans/         # Implementation plans
```

**Ghi chú kiến trúc:**
- `FE/src/configs/supabase.js`: export `null` nếu env vars chưa điền — tránh crash local.
- `useSessionsRealtime`: subscribe `postgres_changes` trên `availability_slots` + polling 25s fallback.
- `responded_count`: `COUNT(DISTINCT user_id) FROM availability_slots` — không dùng `session_participants` (RLS issues).

---

## Git Branches

| Nhánh | Mục đích |
|---|---|
| `main` | Production — chỉ merge khi test kỹ |
| `dev` | Integration — base tạo nhánh tính năng |
| `feature/be-*` | Backend |
| `feature/fe-*` | Frontend |
| `feature/fix-*` | Bugfix |

Tất cả nhánh tách từ `dev`, merge về `dev` khi xong.
