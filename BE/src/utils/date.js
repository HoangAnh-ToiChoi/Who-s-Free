// BE/src/utils/date.js

/**
 * Chuẩn hoá giá trị cột DATE thành "YYYY-MM-DD".
 * pg trả DATE là Date nửa đêm theo giờ máy chủ nên dùng getter local (toISOString sẽ lệch ngày khi máy chủ lệch UTC).
 */
export function toDateString(value) {
  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }
  return String(value ?? "").slice(0, 10);
}
