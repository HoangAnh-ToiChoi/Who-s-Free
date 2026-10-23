/**
 * Format median response hours thành chuỗi hiển thị thân thiện.
 * null → chưa có dữ liệu; số giờ → "< 1 giờ", "~3 giờ", "~2 ngày", v.v.
 */
export function formatResponseTime(hours, locale = "vi") {
  if (hours == null || !Number.isFinite(hours) || hours < 0) {
    return locale === "vi" ? "Chưa có dữ liệu" : "No data yet";
  }

  if (hours < 1) {
    return locale === "vi" ? "< 1 giờ" : "< 1 hr";
  }

  if (hours < 24) {
    const rounded = Math.round(hours);
    return locale === "vi" ? `~${rounded} giờ` : `~${rounded} hr${rounded !== 1 ? "s" : ""}`;
  }

  const days = Math.round(hours / 24);
  return locale === "vi" ? `~${days} ngày` : `~${days} day${days !== 1 ? "s" : ""}`;
}
