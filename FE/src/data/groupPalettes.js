/**
 * groupPalettes.js - Quản lý bảng màu theo mục đích nhóm (Category Color Palettes)
 *
 * Chia theo 3 mục đích nhóm với 3 bảng màu chuyên biệt cho từng mục:
 * 1. work (Công việc & Học tập): Các gam màu chuyên nghiệp, tập trung (indigo, blue, sky)
 * 2. hangout (Đi chơi & Tụ tập): Các gam màu tươi sáng, năng động (emerald, teal, amber)
 * 3. other (Mục khác): Các gam màu sáng tạo, cá tính (purple, rose, orange)
 */

export const CATEGORY_PALETTES = {
  work: ["purple", "rose", "orange"],
  hangout: ["emerald", "teal", "amber"],
  other: ["indigo", "blue", "sky"],
};

export const ALL_THEME_COLORS = [
  "indigo",
  "blue",
  "sky",
  "emerald",
  "teal",
  "amber",
  "purple",
  "rose",
  "orange",
];

/**
 * Chọn ngẫu nhiên 1 màu trong bảng màu của mục đích nhóm tương ứng
 * @param {string} category - "work" | "hangout" | "other"
 * @returns {string} tên mã màu (CSS theme token)
 */
export function getRandomColorByCategory(category = "work") {
  const palette = CATEGORY_PALETTES[category] || CATEGORY_PALETTES.work;
  const randomIndex = Math.floor(Math.random() * palette.length);
  return palette[randomIndex];
}

/**
 * Lấy màu đại diện cho nhóm:
 * - Nếu nhóm đã lưu sẵn màu hợp lệ trong database -> sử dụng luôn màu đó.
 * - Nếu chưa có hoặc cần fallback -> tự động băm (hash) theo id/tên nhóm trong đúng bảng màu của mục đích đó để đảm bảo màu luôn ổn định khi reload.
 *
 * @param {object} group - Nhóm
 * @returns {string} tên mã màu (CSS theme token)
 */
export function getGroupThemeColor(group) {
  if (group?.color && ALL_THEME_COLORS.includes(group.color)) {
    return group.color;
  }

  const category = group?.category || "work";
  const palette = CATEGORY_PALETTES[category] || CATEGORY_PALETTES.work;

  const seedStr = `${group?.id || ""}${group?.name || ""}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  return palette[Math.abs(hash) % palette.length];
}
