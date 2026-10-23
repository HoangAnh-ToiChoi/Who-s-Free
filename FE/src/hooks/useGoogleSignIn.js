import { useState } from "react";
import { backendUrl } from "~/utils/backendApi";

const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 90000;

async function isBackendReady() {
  try {
    const response = await fetch(backendUrl("/health"), {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * useGoogleSignIn - Đăng nhập Google qua Backend.
 * Máy chủ gói miễn phí có thể đang "ngủ": kiểm tra sẵn sàng trước, đợi tới khi phản hồi rồi mới
 * chuyển sang Google để người dùng không bị đưa tới trang chờ của nhà cung cấp hosting.
 */
export function useGoogleSignIn(returnUrl) {
  const [isConnecting, setIsConnecting] = useState(false);

  const startGoogleSignIn = async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline && !(await isBackendReady())) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    const params = new URLSearchParams({ returnUrl });
    window.location.href = `${backendUrl("/auth/google")}?${params}`;
  };

  return { isConnecting, startGoogleSignIn };
}

export default useGoogleSignIn;
