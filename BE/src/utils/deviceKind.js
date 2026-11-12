// Xếp thiết bị vào 3 loại để giới hạn mỗi tài khoản 1 phiên / loại (điện thoại, máy tính bảng, máy tính).
// Chỉ dùng để xếp nhóm, KHÔNG dùng để xác thực (User-Agent tự khai, giả được) — token mới là bằng chứng đăng nhập.
// Hạn chế đã biết: iPad đời mới trên Safari tự nhận là Mac nên bị tính là máy tính.

const USER_AGENT_MAX = 300;
const TABLET = /ipad|tablet|playbook|silk|kindle|sm-t\d|nexus (7|9|10)/i;
const MOBILE = /mobi|iphone|ipod|android|windows phone|opera mini|iemobile|blackberry/i;

/**
 * @param {string} userAgent
 * @param {string} [mobileHint] - header Sec-CH-UA-Mobile ("?1" = điện thoại) mà Chrome/Edge/Cốc Cốc gửi kèm
 * @returns {"mobile"|"tablet"|"desktop"}
 */
export function detectDeviceKind(userAgent = "", mobileHint) {
  const ua = String(userAgent);
  if (TABLET.test(ua)) return "tablet";
  // Android không có chữ "Mobile" là máy tính bảng
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablet";
  if (mobileHint === "?1" || MOBILE.test(ua)) return "mobile";
  return "desktop";
}

/** Thông tin thiết bị của request: { kind, userAgent } (userAgent cắt còn 300 ký tự để lưu). */
export function deviceFromRequest(req) {
  const userAgent = String(req?.headers?.["user-agent"] || "").slice(0, USER_AGENT_MAX);
  return { kind: detectDeviceKind(userAgent, req?.headers?.["sec-ch-ua-mobile"]), userAgent };
}
