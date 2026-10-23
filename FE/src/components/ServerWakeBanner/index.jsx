import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { serverWakeStore } from "~/utils/serverWake";

/**
 * ServerWakeBanner - Dải thông báo nhỏ ở đầu trang khi hệ thống cần thêm thời gian để phản hồi.
 * Tự hiện/ẩn theo trạng thái của serverWakeStore (do backendApi cập nhật).
 */
function ServerWakeBanner() {
  const { t } = useTranslation();
  const isWaking = useSyncExternalStore(serverWakeStore.subscribe, serverWakeStore.getSnapshot);
  if (!isWaking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-full bg-slate-900/95 px-4 py-2 text-xs font-medium text-white shadow-lg"
    >
      <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <span>{t("system.waking")}</span>
    </div>
  );
}

export default ServerWakeBanner;
