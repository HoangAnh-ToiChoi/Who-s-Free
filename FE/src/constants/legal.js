// Thông tin dùng chung cho trang Điều khoản dịch vụ và Chính sách bảo mật.
export const LEGAL_UPDATED_AT = "18/11/2026";

/** Email nhận yêu cầu về dữ liệu cá nhân / khiếu nại. Để trống thì trang hiện hướng dẫn liên hệ người phụ trách dự án. */
export const LEGAL_CONTACT_EMAIL = "";

/** Nhà cung cấp hạ tầng đang dùng thực tế (bên xử lý dữ liệu). */
export const SERVICE_PROVIDERS = [
  ["Supabase", "Cơ sở dữ liệu và hệ thống đăng nhập. Máy chủ đặt tại Tokyo, Nhật Bản."],
  ["Render", "Máy chủ chạy API (phần xử lý phía sau)."],
  ["Vercel / GitHub Pages", "Lưu trữ và phân phối giao diện web."],
  ["Brevo", "Gửi email: mã xác thực, mã đặt lại mật khẩu, lời mời, lịch đã chốt, nhắc hạn."],
  ["Google", "Chỉ khi bạn chọn \"Đăng nhập bằng Google\": Google xác thực bạn và gửi lại tên, email, ảnh đại diện."],
  ["GitHub", "Lưu mã nguồn và bản sao lưu cơ sở dữ liệu đã được mã hoá."],
  ["cron-job.org", "Chỉ gọi các tác vụ định kỳ (nhắc hạn, dọn dữ liệu cũ); không nhận dữ liệu cá nhân."],
];
