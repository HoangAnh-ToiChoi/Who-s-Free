import BodyPortal from "~/components/BodyPortal";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { minutesToTimeString } from "~/utils/timeUtils";
import { cn } from "~/lib/utils";

// Mobile (< sm): bấm ô là popover bật ngay tại chỗ, che lưới → hiện dạng tấm cố định ở đáy màn hình.
const isNarrowScreen = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

/**
 * CellDetailPopover - Popover hiển thị chi tiết danh sách thành viên rảnh/bận
 *
 * Định vị kề bên ô được chọn (không che khuất ô và viền vàng),
 * tuân thủ chuẩn Rule 3.2 về nút đóng (h-9 w-9 rounded-xl, X 18px strokeWidth 2.2).
 */
function CellDetailPopover({
  isOpen,
  cellData,
  blockStart,
  dayName,
  position,
  popoverRef,
  onClose,
}) {
  const { t } = useTranslation();

  if (!isOpen || !cellData) return null;

  const blockEnd = blockStart + 30;
  const timeRange = `${minutesToTimeString(blockStart)} – ${minutesToTimeString(blockEnd)}`;

  const asSheet = isNarrowScreen();

  const content = (
    <div
      ref={popoverRef}
      style={
        asSheet
          ? undefined
          : {
              top: position ? `${position.top}px` : "50px",
              left: position ? `${position.left}px` : "50px",
              visibility: position ? "visible" : "hidden",
            }
      }
      className={cn(
        "z-50 overflow-y-auto border border-slate-200/90 bg-white p-4 shadow-[0_20px_45px_-12px_rgba(15,23,42,0.18),0_4px_16px_-2px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5",
        asSheet
          ? "fixed inset-x-3 bottom-3 max-h-[45dvh] rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-150"
          : "absolute max-h-88 w-76 rounded-2xl transition-all duration-150"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <p className="text-xs font-bold text-slate-900 max-sm:text-sm">
            {dayName} · {timeRange}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t("leadMatrix.availableCount", {
              count: cellData.count,
              total: cellData.totalMembers || 0,
            })}
          </p>
        </div>

        {/* Nút đóng chuẩn Rule 3.2: h-9 w-9 rounded-xl, X 18px */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close", "Đóng")}
          className="flex h-11 w-11 sm:h-9 sm:w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 max-sm:bg-slate-100 max-sm:text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* Danh sách thành viên rảnh */}
      {cellData.members && cellData.members.length > 0 ? (
        <div className="space-y-1.5">
          {cellData.members.map((m) => {
            const name = m.name || "Thành viên";
            const initial = name.charAt(0).toUpperCase() || "M";
            return (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2 py-1.5"
              >
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt={name}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = "flex";
                      }
                    }}
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <span
                  style={{ display: m.avatarUrl ? "none" : "flex" }}
                  className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-bold text-emerald-800"
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {m.role || "Thành viên"}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {t("leadMatrix.statusFree")}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-slate-400 italic">
          {t("leadMatrix.noOneAvailable")}
        </p>
      )}
    </div>
);
  return asSheet ? <BodyPortal>{content}</BodyPortal> : content;
}

export default CellDetailPopover;
