import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Hand, X } from "lucide-react";
import { DragRangeLabel } from "../AvailabilityGrid/DragRangeIndicator";

const DISMISS_KEY = "whosfree:touchDragHintDismissed";

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Gợi ý "nhấn giữ rồi kéo" — chỉ hiện trên màn hình cảm ứng (pointer: coarse), vì vuốt ngay là cuộn lưới
 * nên người dùng không tự đoán ra cách chọn giờ. Nằm cạnh nút xoá trên thanh công cụ để không tốn thêm dòng của lưới.
 * Bấm X để ẩn hẳn (nhớ trên máy đó).
 * Đang kéo bằng cảm ứng (dragPreview): chip đổi thành giờ đang chọn — kể cả khi gợi ý đã bị ẩn — để thông tin
 * nằm phía trên lưới thay vì nổi đè lên vùng ngón tay đang kéo.
 */
function TouchDragHint({ dragPreview, weekDays }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dragPreview) {
    return (
      <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white whitespace-nowrap">
        <DragRangeLabel dragPreview={dragPreview} weekDays={weekDays} />
      </div>
    );
  }
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Chế độ ẩn danh / chặn lưu trữ: chỉ ẩn trong phiên này
    }
  };

  return (
    <div className="hidden min-w-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-0.5 pr-0.5 pl-2.5 text-[11px] font-semibold text-emerald-800 [@media(pointer:coarse)]:flex">
      <Hand size={13} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{t("matrix.touchDragHint")}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("matrix.touchDragHintDismiss")}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-700"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default TouchDragHint;
