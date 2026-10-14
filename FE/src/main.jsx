import { createRoot } from "react-dom/client";
import App from "~/App.jsx";
import "~/styles/reset.css";
import "~/styles/main.css";
import "~/styles/scrollbar.css";
import "~/i18n";
import { initSecurityBanner } from "~/utils/securityBanner";

// Kích hoạt banner cảnh báo an ninh Console chống Self-XSS
initSecurityBanner();

createRoot(document.getElementById("root")).render(<App />);
