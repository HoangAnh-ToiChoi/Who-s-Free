import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  minutesToTimeString,
  timeStringToMinutes,
  formatDuration,
} from "~/utils/timeUtils";
import TimePicker from "./TimePicker";

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
      setStartTime(minutesToTimeString(slotData.startMinutes));
      setEndTime(minutesToTimeString(slotData.endMinutes));
      setNote(slotData.note || "");
    }
  }, [slotData]);

  if (!isOpen || !slotData) return null;

  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);
  const isInvalidTime = endMin <= startMin;
  const durationText = isInvalidTime
    ? t("slotPopover.durationInvalid")
    : formatDuration(startMin, endMin);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isInvalidTime) return;
    onSave({
      ...slotData,
      startMinutes: startMin,
      endMinutes: endMin,
      note: note.trim(),
    });
  };

  const isEditMode = mode === "edit";
  const isRight = anchorPos?.placement === "right";

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${anchorPos?.top || 0}px`,
        left: `${anchorPos?.left || 0}px`,
      }}
      className="absolute z-50 w-[330px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Arrow */}
      {isRight ? (
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
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        {/* START & END custom pickers */}
        <div className="grid grid-cols-2 gap-2.5">
          <TimePicker
            label="START"
            value={startTime}
            onChange={setStartTime}
            hasError={isInvalidTime}
          />
          <TimePicker
            label="END"
            value={endTime}
            onChange={setEndTime}
            disabledBefore={startMin}
            hasError={isInvalidTime}
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
            placeholder={t("slotPopover.notePlaceholder")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Error message / Notice section (thay the cho Visible to Maya Lin) */}
        {isInvalidTime ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold animate-in fade-in duration-150 py-0.5">
            <AlertCircle size={14} className="shrink-0 text-rose-500" />
            <span>{t("slotPopover.invalidTime")}</span>
          </div>
        ) : (
          <div className="min-h-[20px]" />
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          {isEditMode ? (
            <button
              type="button"
              onClick={() => onDelete(slotData.id)}
              className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors active:scale-[0.98]"
            >
              <Trash2 size={14} />
              <span>{t("slotPopover.delete")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
            >
              {t("slotPopover.cancel")}
            </button>
          )}

          <Button
            type="submit"
            disabled={isInvalidTime}
            className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{isEditMode ? t("slotPopover.apply") : t("slotPopover.apply")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SlotPopover;
