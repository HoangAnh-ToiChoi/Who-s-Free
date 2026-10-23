# Who's Free

> Nền tảng điều phối lịch trình nhóm — thu thập thời gian rảnh trực quan, tính toán mật độ trùng lịch và hỗ trợ chốt lịch họp tối ưu.

---

## Tổng quan

Sắp xếp lịch họp cho nhóm thường mất thời gian vì hỏi đáp thủ công và thiếu trực quan. **Who's Free** giải quyết bài toán này qua quy trình hai bước:

1. **Member** kéo-thả trên lưới tuần (30-min slots) để đánh dấu thời gian rảnh — lịch cá nhân được bảo mật, người khác không nhìn thấy.
2. **Lead** quan sát **Lead Overlap Matrix** để thấy ngay khung giờ nào cả nhóm đều rảnh, rồi chốt lịch họp.

---

## Tính năng

| Tính năng | Mô tả |
| :--- | :--- |
| Xác thực | Email/Password + Google OAuth (Supabase Auth), JWT + Refresh Token Rotation |
| Quản lý nhóm | Tạo nhóm, mời thành viên qua email hoặc invite link |
| Phân quyền | Lead / Member độc lập theo từng nhóm |
| Calendar | Nhiều calendar tuần trong một nhóm |
| Availability | Drag-to-select 30-min slots, riêng tư theo mặc định |
| Lead Matrix | Overlap Density, Suggested Times, Finalize Meeting |
| Realtime | `respondedCount` cập nhật ngay khi member kéo slot (Supabase Realtime + 25s polling fallback) |

**Không có trong MVP:** AI/LLM, real-time slot visibility, mobile native, thanh toán, org-level management.

---

## Tech Stack

| Tầng | Công nghệ |
| :--- | :--- |
| Frontend | React + Vite, Tailwind CSS |
| Backend | Node.js + Express (MVC), ES Modules |
| Database & Auth | Supabase PostgreSQL (RLS), Supabase Auth |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Hosting | Vercel (FE), Render (BE) |

---

## Cấu trúc thư mục

```
Who'sFree/
├── BE/                          # Backend — Node.js + Express
│   ├── src/
│   │   ├── configs/             # db.config.js, supabase.config.js
│   │   ├── constants/           # errorCodes.js
│   │   ├── controllers/         # Parse req → service → res
│   │   ├── middlewares/         # auth, rateLimit, validate
│   │   ├── models/              # DB operations
│   │   ├── routes/              # Route definitions
│   │   ├── services/            # Business logic
│   │   ├── utils/mappers/       # toPublicX transforms
│   │   └── validations/         # Zod schemas
│   └── tests/
│       ├── unit/                # Pure logic, mock DB
│       └── *.test.js            # Integration tests (real DB)
│
├── FE/                          # Frontend — React + Vite
│   └── src/
│       ├── components/          # Shared UI (Modals, shadcn primitives)
│       ├── configs/             # supabase.js (null-safe)
│       ├── contexts/            # AuthContext, GroupContext
│       ├── hooks/               # useGroupDetail, useSessionsRealtime, ...
│       ├── pages/               # Auth, Group, Home, LeadMatrix, MemberMatrix, Invite, Join
│       ├── service/             # API calls theo domain
│       └── utils/               # http, tokenManager, calculations, dateUtils, ...
│
└── docs/superpowers/
    ├── specs/                   # Design docs
    └── plans/                   # Implementation plans
```

---

## Cài đặt & chạy local

### Yêu cầu

- Node.js v18+
- Supabase project (có sẵn database schema)

### Backend (`BE/`)

```bash
cd BE
npm install
cp .env.example .env   # điền các biến môi trường
npm run dev            # http://localhost:3000
```

**`BE/.env`:**
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://...@...supabase.com:5432/postgres
JWT_SECRET=your-secret-at-least-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=5
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Production:** Dùng Supabase Pooler URL (Transaction mode, port 6543) cho `DATABASE_URL` để tránh vượt giới hạn connection của Supabase.

### Frontend (`FE/`)

```bash
cd FE
npm install
cp .env.example .env.local   # điền các biến môi trường
npm run dev                   # http://localhost:5173
```

**`FE/.env.local`:**
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Chạy tests

```bash
# BE integration tests (cần real DB)
cd BE
NODE_ENV=test JWT_SECRET=test-secret-at-least-32-characters-long \
  CLIENT_ORIGIN=http://localhost:5173 \
  node --test tests/*.test.js

# BE unit tests (không cần DB)
NODE_ENV=test node --test tests/unit/*.test.js

# FE lint
cd FE && npm run lint
```

---

## Phân quyền

Vai trò được áp dụng độc lập theo từng nhóm — một user có thể là **Lead** ở Group A nhưng là **Member** ở Group B.

| Vai trò | Quyền |
| :--- | :--- |
| **Lead** | Quản lý nhóm, mời thành viên, xem Lead Matrix, chốt lịch họp |
| **Member** | Kéo-thả lịch rảnh của mình, không xem lịch của người khác |
