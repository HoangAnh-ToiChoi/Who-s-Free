// BE/src/utils/fileName.js

/** Tên file an toàn (không dấu, không ký tự đặc biệt) từ một tiêu đề tiếng Việt. */
export function toSafeFileName(title, extension, fallback = "file") {
  const base = String(title || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || fallback}.${extension}`;
}
