# CLAUDE.md — Hướng dẫn làm việc cho Who's Free

## Mô tả sản phẩm

**Who's Free** (tên thương mại: ClubSync / Syncura) là nền tảng điều phối lịch trình nhóm thông minh. Mục tiêu cốt lõi: giúp đội nhóm, câu lạc bộ, hay dự án liên chức năng chốt được lịch họp chung mà không cần hỏi đáp qua lại thủ công.

Luồng chính của sản phẩm gồm hai vai trò:

- **Member** kéo-thả trên lưới tuần (Weekly 30-min Grid) để đánh dấu thời gian rảnh của mình — lịch cá nhân được bảo mật, người khác không nhìn thấy.
- **Lead** quan sát **Lead Overlap Matrix** — ma trận trực quan thể hiện mật độ trùng lịch của toàn nhóm, từ đó chọn khung giờ vàng và chốt lịch họp chính thức.

### Phạm vi sản phẩm (MVP)

| Tính năng | Mô tả ngắn |
|---|---|
| Xác thực | Email/Password + Google OAuth qua Supabase Auth, JWT + Refresh Token Rotation |
| Quản lý nhóm | Tạo nhóm, mời thành viên qua email/link, phân quyền Lead/Member độc lập theo nhóm |
| Calendar | Tạo nhiều calendar tuần trong một nhóm |
| Availability | Drag-to-select 30-min slots, riêng tư theo mặc định |
| Lead Matrix | Overlap Density, Suggested Times, Finalize Meeting |

### Ranh giới sản phẩm (không làm)

- Không tích hợp AI hay mô hình ngôn ngữ vào thuật toán Overlap — thuần logic.
- Không có real-time collaboration (WebSocket) trong MVP — polling hoặc manual refresh.
- Không có mobile app native — web responsive là đủ.
- Không có hệ thống thanh toán, subscription, hay multi-tenant phức tạp trong MVP.
- Không mở rộng phạm vi quản lý tổ chức (org-level) — chỉ group-scoped.

### Tech Stack

| Tầng | Công nghệ |
|---|---|
| Frontend | React + Vite, Tailwind CSS |
| Backend | Node.js + Express (MVC: model → service → controller), ES Modules |
| Database / Auth | Supabase PostgreSQL, Supabase Auth |
| Hosting | Vercel (FE), Render (BE) |

---

## Quy trình làm việc (Workflow)

Mỗi lần HA đưa ra yêu cầu, mình sẽ thực hiện theo đúng trình tự dưới đây — không bỏ bước nào, không tự ý merge vào `dev` hay `main` khi chưa được cho phép.

### Bước 1 — Làm rõ yêu cầu

Nếu yêu cầu còn mơ hồ hoặc có thể hiểu nhiều cách, hỏi thêm trước khi làm. Nếu rõ ràng rồi thì bắt tay vào luôn.

### Bước 2 — Tạo nhánh tính năng

Tạo nhánh mới từ `dev` với quy ước đặt tên:

```
feature/be-<chức năng>   # Backend
feature/fe-<chức năng>   # Frontend
feature/fix-<vấn đề>     # Bugfix
```

Ví dụ: `feature/be-overlap-algorithm`, `feature/fe-lead-matrix`.

### Bước 3 — Lên kế hoạch

Chia nhỏ công việc thành các task độc lập, mỗi task đủ nhỏ để test ngay sau khi hoàn thành. Ưu tiên viết code đơn giản — nếu 3 dòng làm được thì không viết 10 dòng. Không thêm abstraction khi chưa cần thiết.

### Bước 4 — Triển khai

Làm từng task một theo thứ tự. Mỗi task:

1. Viết code.
2. Tự review lại: đúng yêu cầu chưa? có gì dư thừa không? import có bị vỡ không?
3. Chạy test (nếu có test liên quan).
4. Nếu test fail → tìm nguyên nhân, fix, chạy lại — lặp cho đến khi không còn lỗi.
5. Commit gọn, message rõ ràng theo format: `feat|fix|refactor|docs(scope): mô tả ngắn`.

### Bước 5 — Kiểm tra tổng thể

Sau khi tất cả task xong:

- Chạy lại toàn bộ test suite liên quan.
- Grep kiểm tra không còn `console.log` debug thừa, import vỡ, hay `toPublicX` còn sót trong model.
- Đảm bảo không có file nào bị bỏ quên chưa commit.

### Bước 6 — Hỏi HA

Báo cáo ngắn gọn những gì đã làm, kết quả test, sau đó hỏi:

> "Mọi thứ ổn rồi. HA muốn push code lên GitHub không?"

Nếu HA đồng ý → push lên nhánh `feature/` tương ứng. Không tự push khi chưa được xác nhận.

---

## Nguyên tắc viết code

- **Đơn giản trước.** Không viết thêm layer, wrapper, hay helper nếu chưa có ít nhất 3 chỗ cần dùng.
- **Một file — một trách nhiệm.** Model chỉ làm DB ops. Service chỉ làm business logic. Mapper chỉ transform data.
- **Không comment hiển nhiên.** Chỉ comment khi lý do không tự rõ từ code — constraint ẩn, workaround, invariant quan trọng.
- **Không thêm error handling cho trường hợp không thể xảy ra.** Tin tưởng vào internal code và framework guarantees.
- **Test trước khi báo xong.** Không báo "đã xong" khi chưa chạy lệnh test và xác nhận output bằng mắt.

---

## Cấu trúc thư mục hiện tại

```
Who'sFree/
├── BE/                          # Backend — Node.js + Express
│   ├── src/
│   │   ├── configs/             # db.config.js, supabase.config.js
│   │   ├── controllers/         # Điều hướng request/response
│   │   ├── middlewares/         # auth, rateLimit, validation
│   │   ├── models/              # Data access — mỗi file = 1 bảng DB
│   │   ├── routes/              # Route definitions
│   │   ├── services/            # Business logic
│   │   └── utils/
│   │       ├── mappers/         # Pure transform functions (toPublicX)
│   │       ├── AppError.js
│   │       ├── ApiResponse.js
│   │       └── uuid.js
│   └── tests/                   # Integration tests (node:test)
│
├── FE/                          # Frontend — React + Vite + Tailwind
│   └── src/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       └── services/
│
└── docs/
    └── superpowers/
        ├── specs/               # Design docs
        └── plans/               # Implementation plans
```

---

## Nhánh Git

| Nhánh | Mục đích |
|---|---|
| `main` | Production — chỉ merge khi đã test kỹ |
| `dev` | Integration — base để tạo nhánh tính năng |
| `feature/be-*` | Backend features |
| `feature/fe-*` | Frontend features |
| `feature/fix-*` | Bugfixes |

Mọi nhánh tính năng đều tách từ `dev` và merge về `dev` khi xong — không làm thẳng trên `dev` hay `main`.
