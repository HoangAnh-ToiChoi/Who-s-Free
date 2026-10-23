import { createRoot } from "react-dom/client";
import App from "~/App.jsx";
import "~/styles/reset.css";
import "~/styles/main.css";
import "~/styles/scrollbar.css";
import "~/i18n";
import { initSecurityBanner } from "~/utils/securityBanner";
import { warmUpBackend } from "~/utils/serverWake";
import { backendHealthUrl } from "~/utils/backendApi";

// Kích hoạt banner cảnh báo an ninh Console chống Self-XSS
initSecurityBanner();

// Đánh thức máy chủ ngay khi mở web để lúc người dùng đăng nhập thì máy chủ đã sẵn sàng
warmUpBackend(backendHealthUrl());

createRoot(document.getElementById("root")).render(<App />);
