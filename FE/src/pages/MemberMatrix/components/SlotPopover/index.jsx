import BodyPortal from "~/components/BodyPortal";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  minutesToTimeString,
  timeStringToMinutes,
  formatDuration,
} from "~/utils/timeUtils";
import TimePicker from "./TimePicker";
import SlotPopoverFooter from "./SlotPopoverFooter";

// Mobile (< sm): popover neo theo slot hay bị lọt xuống đáy và bị cắt → hiện dạng tấm cố định ở đáy màn hình.
const isNarrowScreen = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

/**
 * SlotPopover - Popover nhỏ neo trực tiếp vào khối thời gian
 * Đồng bộ chuẩn bảng màu Indigo thương hiệu Who's Free.
 */
function SlotPopover({
  isOpen,
  mode = "new",
  slotData,
  anchorPos,
  onSave,
  hasConflict,
  onDelete,
  onClose,
}) {
  const { t } = useTranslation();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [note, setNote] = useState("");
  const popoverRef = useRef(null);

  useEffect(() => {
    if (slotData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartTime(minutesToTimeString(slotData.startMinutes));
      setEndTime(minutesToTimeString(slotData.endMinutes));
      setNote(slotData.note || "");
    }
  }, [slotData]);

  if (!isOpen || !slotData) return null;

  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);
  const isInvalidTime = endMin <= startMin;
  const overlaps = !isInvalidTime && Boolean(hasConflict?.(startMin, endMin));
  const isBlocked = isInvalidTime || overlaps;
  const errorText = isInvalidTime ? t("slotPopover.invalidTime") : overlaps ? t("slotPopover.overlapTime") : null;
  const durationText = isInvalidTime
    ? t("slotPopover.durationInvalid")
    : formatDuration(startMin, endMin);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isBlocked) return;
    onSave({
      ...slotData,
      startMinutes: startMin,
      endMinutes: endMin,
      note: note.trim(),
    });
  };

  const isEditMode = mode === "edit";
  const isRight = anchorPos?.placement === "right";
  const asSheet = isNarrowScreen();

  const content = (
    <div
      ref={popoverRef}
      style={asSheet ? undefined : { top: `${anchorPos?.top || 0}px`, left: `${anchorPos?.left || 0}px` }}
      className={cn(
        "z-50 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl animate-in fade-in duration-150 select-none",
        asSheet
          ? "fixed inset-x-3 bottom-3 rounded-3xl slide-in-from-bottom-4"
          : "absolute w-[330px] zoom-in-95"
      )}
    >
      {/* Arrow (chỉ khi neo cạnh slot) */}
      {asSheet ? null : isRight ? (
        <div
          style={{ top: `${anchorPos?.arrowTop ?? 32}px` }}
          className="absolute -left-2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-slate-200/90 bg-white transition-[top] duration-150"
        />
      ) : (
        <div
          style={{ top: `${anchorPos?.arrowTop ?? 32}px` }}
          className="absolute -right-2 h-4 w-4 -translate-y-1/2 rotate-45 border-t border-r border-slate-200/90 bg-white transition-[top] duration-150"
        />
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-slate-900 leading-tight">
            {isEditMode ? t("slotPopover.editSlot") : t("slotPopover.newSlot")}
          </h4>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-semibold border transition-colors",
              isInvalidTime
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-indigo-100/90 text-indigo-800 border-indigo-200/60"
            )}
          >
            {durationText}
          </span>
        </div>
        {/* Mobile: nút đóng to, có chữ để dễ bấm bằng ngón tay; desktop giữ icon nhỏ */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-600 sm:h-7 sm:w-7 sm:bg-transparent sm:px-0 sm:text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
        >
          <X size={18} className="sm:size-4" />
          <span className="sm:hidden">{t("common.close")}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        {/* START & END custom pickers */}
        <div className="grid grid-cols-2 gap-2.5">
          <TimePicker
            label={t("slotPopover.start")}
            value={startTime}
            onChange={setStartTime}
            hasError={isBlocked}
          />
          <TimePicker
            label={t("slotPopover.end")}
            value={endTime}
            onChange={setEndTime}
            disabledBefore={startMin}
            hasError={isBlocked}
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t("slotPopover.noteLabel")}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t("slotPopover.notePlaceholder")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Error message / Notice section (thay the cho Visible to Maya Lin) */}
        {errorText ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold animate-in fade-in duration-150 py-0.5">
            <AlertCircle size={14} className="shrink-0 text-rose-500" />
            <span>{errorText}</span>
          </div>
        ) : (
          <div className="min-h-[20px]" />
        )}

        <SlotPopoverFooter
          isEditMode={isEditMode}
          isInvalidTime={isBlocked}
          onDelete={() => onDelete(slotData.id)}
          onClose={onClose}
        />
      </form>
    </div>
);
  return asSheet ? <BodyPortal>{content}</BodyPortal> : content;
}

export default SlotPopover;
