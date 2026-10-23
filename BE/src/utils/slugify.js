import { randomBytes } from "node:crypto";

/**
 * Chuyển đổi chuỗi thành dạng slug URL chuẩn Web/SEO:
 * - Chuyển sang chữ thường
 * - Khử dấu tiếng Việt
 * - Loại bỏ ký tự đặc biệt
 * - Thay khoảng trắng thành dấu gạch ngang (-)
 *
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "") // Bỏ ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng dấu gạch nối
    .replace(/-+/g, "-"); // Tránh lặp --
}

/**
 * Tạo slug duy nhất kèm random suffix
 * @param {string} text
 * @param {number} bytes
 * @returns {string} Ví dụ: "frontend-team-a3f1"
 */
export function generateUniqueSlug(text, bytes = 3) {
  const base = slugify(text) || "group";
  const suffix = randomBytes(bytes).toString("hex");
  return `${base}-${suffix}`;
}

export default slugify;
