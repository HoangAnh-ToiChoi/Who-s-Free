import { useState } from "react";
import { backendUrl, backendHealthUrl } from "~/utils/backendApi";
import { waitForBackend } from "~/utils/serverWake";

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

    await waitForBackend(backendHealthUrl());

    const params = new URLSearchParams({ returnUrl });
    window.location.href = `${backendUrl("/auth/google")}?${params}`;
  };

  return { isConnecting, startGoogleSignIn };
}

export default useGoogleSignIn;
