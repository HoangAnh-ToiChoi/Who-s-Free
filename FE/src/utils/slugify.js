/**
 * Chuyển đổi chuỗi tiếng Việt hoặc tiếng Anh thành dạng slug URL chuẩn Web/SEO:
 * - Chuyển sang chữ thường
 * - Khử dấu tiếng Việt
 * - Loại bỏ ký tự đặc biệt
 * - Thay khoảng trắng thành dấu gạch ngang (-)
 *
 * @param {string} text - Chuỗi cần chuyển đổi
 * @returns {string} Chuỗi slug
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

export default slugify;
