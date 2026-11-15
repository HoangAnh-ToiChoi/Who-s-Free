import copyToClipboard from "copy-to-clipboard";

/**
 * Copy văn bản vào clipboard. Không có navigator.clipboard (http, trình duyệt cũ, bị chặn quyền)
 * thì dùng execCommand; nếu vẫn không được, copy-to-clipboard hiện hộp thoại chứa sẵn văn bản để chọn tay.
 * @returns {Promise<boolean>} true khi đã copy
 */
export async function copyText(text, promptMessage) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // bị từ chối quyền: thử cách dự phòng bên dưới
    }
  }
  return copyToClipboard(text, { message: promptMessage });
}

export default copyText;
