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

/**
 * Sinh mã định danh ngẫu nhiên (6-8 ký tự không thể đoán trước)
 * @param {number} length
 * @returns {string}
 */
export function generateRandomId(length = 6) {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz"; // Bỏ 0, 1, l, o để tránh nhầm lẫn
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Tạo Composite Slug dạng <slug>--<id> thân thiện người dùng nhưng bảo đảm khóa ID
 * @param {string} title
 * @param {string} id
 * @returns {string} Ví dụ: "hop-dot-1--8z2k4p"
 */
export function createCompositeSlug(title, id) {
  const baseSlug = slugify(title) || "session";
  return id ? `${baseSlug}--${id}` : baseSlug;
}

/**
 * Bóc tách ID từ Composite Slug hoặc trả về nguyên vẹn nếu là ID thuần
 * @param {string} param
 * @returns {string}
 */
export function extractIdFromSlug(param) {
  if (!param) return "";
  if (param.includes("--")) {
    return param.split("--").pop();
  }
  return param;
}

export default slugify;
