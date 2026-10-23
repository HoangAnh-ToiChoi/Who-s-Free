import { useEffect, useState } from "react";
import { invitationService } from "~/service/invitationService/invitationService";

/** Lấy token lời mời từ returnUrl dạng "/invite/<token>" (null nếu không phải luồng lời mời). */
export function getInviteTokenFromReturnUrl(returnUrl) {
  return String(returnUrl || "").match(/^\/invite\/([^/?#]+)/)?.[1] ?? null;
}

/**
 * useInviteAccountStatus - Khi trang đăng nhập được mở từ lời mời, hỏi Backend xem email được mời đã có tài khoản chưa
 * để hiện đúng form (đăng nhập bằng mật khẩu hoặc tạo tài khoản ngay tại chỗ).
 *
 * @returns {{ token: string|null, status: "none"|"loading"|"ready", email: string|null, hasAccount: boolean }}
 */
export function useInviteAccountStatus(returnUrl) {
  const token = getInviteTokenFromReturnUrl(returnUrl);
  const [result, setResult] = useState({ token: null, email: null, hasAccount: false, failed: false });

  useEffect(() => {
    if (!token) return;
    let isActive = true;
    invitationService
      .getAccountStatus(token)
      .then((data) => {
        if (isActive) setResult({ token, email: data.email, hasAccount: Boolean(data.hasAccount), failed: false });
      })
      .catch(() => {
        // Token hỏng/hết hạn: quay về đăng nhập thường, trang lời mời sẽ báo lỗi chi tiết
        if (isActive) setResult({ token, email: null, hasAccount: false, failed: true });
      });
    return () => {
      isActive = false;
    };
  }, [token]);

  if (!token) return { token: null, status: "none", email: null, hasAccount: false };
  if (result.token !== token) return { token, status: "loading", email: null, hasAccount: false };
  if (result.failed) return { token, status: "none", email: null, hasAccount: false };
  return { token, status: "ready", email: result.email, hasAccount: result.hasAccount };
}

export default useInviteAccountStatus;
