import { useTranslation } from "react-i18next";
import { Check, CloudOff, Loader2, Lock, RotateCw } from "lucide-react";
import { cn } from "~/lib/utils";

const STYLES = {
  saving: "text-slate-500",
  saved: "text-emerald-600",
  retrying: "text-amber-700 bg-amber-50 border-amber-200",
  failed: "text-rose-700 bg-rose-50 border-rose-200",
  locked: "text-indigo-800 bg-indigo-50 border-indigo-200",
};
const ICONS = { saving: Loader2, saved: Check, retrying: RotateCw, failed: CloudOff, locked: Lock };

/**
 * Trạng thái lưu THẬT của lịch rảnh (UI vẽ slot trước, server mới là nơi quyết định).
 * Đang lưu/Đã lưu: chữ nhỏ; thử lại/thất bại/đã chốt: dải thông báo có nút khi cần.
 */
function SaveStatusIndicator({ status, onRetry }) {
  const { t } = useTranslation();
  if (!STYLES[status]) return null;
  const Icon = ICONS[status];
  const isBanner = status === "retrying" || status === "failed" || status === "locked";

  return (
    <div
      role={isBanner ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold select-none",
        // Mobile: "Đang lưu/Đã lưu" chỉ đọc cho trình đọc màn hình, không chiếm thêm 1 dòng của lưới
        isBanner ? "rounded-xl border px-3 py-2" : "max-sm:sr-only justify-end px-1 -my-1",
        STYLES[status]
      )}
    >
      <Icon size={14} className={cn("shrink-0", status === "saving" && "animate-spin")} />
      <span className="min-w-0 flex-1">{t(`saveStatus.${status}`)}</span>
      {status === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className="h-8 shrink-0 rounded-lg border border-rose-300 bg-white px-3 text-xs font-bold text-rose-700"
        >
          {t("saveStatus.retry")}
        </button>
      )}
    </div>
  );
}

export default SaveStatusIndicator;
