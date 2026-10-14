/**
 * Security & Developer Console Banner
 * 
 * - Dòng 1: Badge chiếc khiên "🛡️ WHO'S FREE SECURITY SYSTEM"
 * - Dòng 2: Plain text "Được xây dựng & phát triển bởi Hoàng Anh ✨" với tông màu xanh/tím dịu mắt
 */

export function initSecurityBanner() {
  if (typeof window === "undefined" || window.__SECURITY_BANNER_INITIALIZED__) {
    return;
  }
  window.__SECURITY_BANNER_INITIALIZED__ = true;

  // Dòng 1: Badge chiếc khiên bảo mật màu tím Indigo
  const shieldBadgeStyle = [
    "background: #4f46e5", // Màu tím Indigo sang trọng
    "color: #ffffff",
    "font-size: 13px",
    "font-weight: 700",
    "padding: 5px 12px",
    "border-radius: 6px",
    "font-family: system-ui, -apple-system, sans-serif",
    "letter-spacing: 0.5px",
    "margin-bottom: 4px",
  ].join(";");

  // Dòng 2: Plain text màu xanh Ocean dịu mắt, dễ đọc
  const textStyle = [
    "color: #0284c7", // Màu xanh tươi sáng, dễ nhìn
    "font-size: 13px",
    "font-weight: 600",
    "font-family: system-ui, -apple-system, sans-serif",
    "padding-top: 4px",
    "line-height: 1.5",
  ].join(";");

  console.info(
    "%c🛡️ WHO'S FREE SECURITY",
    shieldBadgeStyle
  );

  console.info(
    "%cĐược xây dựng & phát triển bởi Hoàng Anh ✨",
    textStyle
  );
}

export default initSecurityBanner;
