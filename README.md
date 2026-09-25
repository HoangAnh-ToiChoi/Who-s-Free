# Who's Free 📅⚡

> **Smart Availability & Overlap Scheduling Platform**
>
> Nền tảng điều phối lịch trình nhóm thông minh: Thu thập thời gian rảnh trực quan, tự động tính toán mật độ trùng lặp (Overlap Density) và hỗ trợ chốt lịch họp tối ưu chỉ trong vài phút.

---

## 📌 Tổng quan dự án (Overview)

Việc sắp xếp lịch họp cho đội nhóm, câu lạc bộ hay dự án liên chức năng thường gặp khó khăn do hỏi đáp thủ công, thiếu trực quan và dễ chồng chéo lịch trình. **ClubSync** giải quyết bài toán này qua quy trình khép kín:

1. **Thành viên (Member):** Kéo-thả trên lưới tuần (Weekly 30-min Grid) để đánh dấu thời gian rảnh, bảo mật lịch cá nhân.
2. **Trưởng nhóm (Lead):** Quan sát trực quan qua **Lead Overlap Matrix**, theo dõi mật độ trùng lịch (Overlap Density) và danh sách gợi ý khung giờ vàng (Suggested Times) để chốt lịch họp (Finalize Meeting).

---

## ✨ Tính năng cốt lõi (MVP Features)

### 1. Xác thực & Quản trị tài khoản (Authentication)
* Đăng ký, đăng nhập bằng Email/Password & Google OAuth thông qua Supabase Auth.
* Quản lý phiên làm việc (Session persistence) và bảo vệ route phía client.

### 2. Quản lý Nhóm & Không gian làm việc (Groups)
* Tạo nhóm mới (người tạo tự động nhận vai trò Lead của nhóm đó).
* Mời thành viên tham gia nhóm thông qua mã/link mời hoặc email.
* Danh sách phân tách rõ ràng giữa nhóm do mình quản lý và nhóm mình tham gia.

### 3. Lịch tuần linh hoạt (Calendars)
* Hỗ trợ tạo nhiều Calendar tuần trong cùng một nhóm để linh hoạt theo từng giai đoạn công việc.
* Giao diện dạng lưới tuần (Weekly View) chia nhỏ theo từng slot 30 phút.

### 4. Thu thập thời gian rảnh (Availability – Core)
* Thao tác chuột trực quan: Kéo-thả (Drag-to-select) với cơ chế tự động snap theo bước 30 phút.
* Hỗ trợ co giãn (resize block), thêm ghi chú (optional note), chỉnh sửa và xóa thời gian đã chọn.
* **Mặc định riêng tư (Private by default):** Thành viên chỉ xem lịch của chính mình. Dữ liệu được bảo vệ nghiêm ngặt ở tầng backend và database.

### 5. Ma trận phân tích trùng lặp & Đề xuất (Lead Overlap Matrix – Core)
* Cấu trúc thông tin trực quan: *Club Member / Role* $\rightarrow$ *Overlap Density* $\rightarrow$ *Time Header* $\rightarrow$ *Member Availability Grid*.
* Đếm số lượng phản hồi nộp lịch (Response count, ví dụ: 10/12 thành viên).
* Tương tác hover / click để kiểm tra danh sách thành viên rảnh trong từng khung giờ.
* **Suggested Times & Lowest Overlap Ranking:** Tự động phát hiện khung giờ tối ưu và xếp hạng các khung giờ ít xung đột dựa trên thuật toán backend mà không cần AI hay hạ tầng nặng nề.

### 6. Chốt lịch họp (Finalize Meeting)
* Lead chọn khung giờ tối ưu nhất sau khi xem ma trận và xác nhận lịch họp chính thức trực tiếp trên hệ thống.

---

## 👥 Mô hình Phân quyền (Group-Scoped Roles)

Hệ thống áp dụng mô hình phân quyền độc lập theo từng nhóm:

| Vai trò (Role) | Phạm vi áp dụng | Quyền hạn chính |
| :--- | :--- | :--- |
| **Lead** | Theo từng Group | Quản lý nhóm, mời thành viên, xem ma trận trùng lịch (Lead Matrix), xem gợi ý và chốt lịch họp (Finalize Meeting). |
| **Member** | Theo từng Group | Tham gia nhóm, xem lịch tuần, tạo/sửa/xóa lịch rảnh của chính mình. Không thể xem lịch riêng tư của thành viên khác. |

> **Nguyên tắc cốt lõi:** Vai trò của người dùng được áp dụng riêng biệt cho từng nhóm. Một người dùng có thể là **Lead** ở Group A nhưng chỉ là **Member** ở Group B. Quyền hạn không bị kế thừa chéo giữa các nhóm.

---

## 🏗️ Kiến trúc kỹ thuật (System Architecture)

Hệ thống được xây dựng theo mô hình **Modular Monolith**, tinh gọn, tập trung vào hiệu năng cao và phân tách rõ ràng trách nhiệm:

```
[ Trình duyệt (Browser / Client) ]
               │
               ▼ (HTTPS / REST)
[ React + Vite Frontend (Vercel) ]
               │
               ▼ (Bearer JWT Auth)
[ Node.js + Express Backend (Render) ]
               │
       ┌───────┴────────────────┐
       ▼                        ▼
[ Supabase Auth ]     [ Supabase PostgreSQL ]
(Session, Token)      (Database, FK, RLS)
```

### Công nghệ sử dụng (Tech Stack)

* **Frontend:** React (Vite), Tailwind CSS
* **Backend:** Node.js, Express.js (Modular Monolith)
* **Database & Auth:** Supabase PostgreSQL (Row Level Security), Supabase Auth
* **Hosting:** Vercel (Frontend), Render (Backend)

---

## 📁 Cấu trúc thư mục dự án (Project Structure)

```
吉祥/
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── assets/             # Hình ảnh, icons tĩnh
│   │   ├── components/         # Base UI components (Button, Modal, Popover)
│   │   ├── features/           # Các module chức năng (Auth, Calendar, Matrix)
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── services/           # HTTP Client & xử lý kết nối backend
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/                     # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Kết nối Supabase, biến môi trường
│   │   ├── controllers/        # Điều hướng request & phản hồi HTTP
│   │   ├── middleware/         # Xác thực Auth Token, kiểm tra quyền theo Group
│   │   ├── routes/             # Định tuyến API nội bộ
│   │   ├── services/           # Xử lý logic nghiệp vụ & thuật toán Overlap
│   │   ├── validators/         # Kiểm tra tính hợp lệ của dữ liệu đầu vào
│   │   └── server.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Local Development)

### 1. Yêu cầu môi trường
* Node.js v18+ hoặc v20+
* Trình quản lý gói: npm (hoặc yarn / pnpm)
* Dự án cấu hình sẵn trên Supabase

### 2. Cấu hình biến môi trường (`.env`)

#### Cấu hình Client (`client/.env.local`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:5000/api
```

#### Cấu hình Server (`server/.env`):
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Cài đặt và khởi chạy

#### Chạy Backend:
```bash
cd server
npm install
npm run dev
# Server chạy tại http://localhost:5000
```

#### Chạy Frontend:
```bash
cd client
npm install
npm run dev
# Ứng dụng chạy tại http://localhost:5173
```

---

## 👥 Phân công trách nhiệm (Core Team)

* **Member 1 (Frontend & Auth Lead):** Xây dựng giao diện ứng dụng, hệ thống Design System, tương tác kéo-thả lịch tuần 30 phút, Lead Matrix và tích hợp xác thực tài khoản.
* **Member 2 (Backend, DB & DevOps):** Thiết kế Database Schema, cơ chế kiểm soát truy cập (RLS), xây dựng tầng dịch vụ xử lý logic, thuật toán tính toán ma trận Overlap và triển khai hệ thống.
