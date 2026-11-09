import { createPortal } from "react-dom";

/**
 * Render thẳng vào <body>. Dùng cho phần tử position:fixed nằm trong trang: <main> của layout và SlideIn chạy
 * hiệu ứng bằng transform, khiến fixed neo theo khối đang trượt (nút/tấm đáy hiện sai chỗ rồi mới nhảy về).
 */
function BodyPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export default BodyPortal;
