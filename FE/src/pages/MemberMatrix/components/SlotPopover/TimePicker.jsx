import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { useClickOutside } from "~/hooks";
import {
  timeStringToMinutes,
  generateTimeOptions,
} from "../../helper/timeUtils";

const TIME_OPTIONS = generateTimeOptions();

/**
 * TimePicker - Component chọn giờ độc lập chuẩn SRP
 * - Hiển thị giá trị đang chọn nổi bật màu Indigo
 * - Hỗ trợ cảnh báo border đỏ và chữ đỏ khi giờ bị lỗi (Validation)
 * - Tự động cuộn đến option đang chọn khi mở
 * - Dùng hook useClickOutside dùng chung, không lặp lại code event listener
 */
function TimePicker({ label, value, onChange, disabledBefore, hasError }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Đóng dropdown khi click ra ngoài bằng hook chuẩn của dự án
  useClickOutside(containerRef, () => setOpen(false));

  // Auto-scroll đến mục đang chọn khi mở dropdown
  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector("[data-selected='true']");
      if (selected) selected.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col gap-1 rounded-xl p-2.5 transition-all border",
        hasError
          ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/50"
          : "bg-slate-50/90 border-slate-200/80"
      )}
    >
      <span
        className={cn(
          "text-[10px] font-bold tracking-wider uppercase select-none transition-colors",
          hasError ? "text-rose-600" : "text-slate-400"
        )}
      >
        {label}
      </span>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between w-full text-sm font-bold focus:outline-none cursor-pointer transition-colors",
          hasError ? "text-rose-700" : "text-slate-800"
        )}
      >
        <span>{value}</span>
        <ChevronDown
          size={14}
          className={cn(
            hasError ? "text-rose-500" : "text-slate-400",
            "transition-transform duration-150 shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[200] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <ul
            ref={listRef}
            className="max-h-48 overflow-y-auto py-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#c7d2fe transparent" }}
          >
            {TIME_OPTIONS.map((time) => {
              const disabled =
                disabledBefore !== undefined &&
                timeStringToMinutes(time) <= disabledBefore;
              const isSelected = time === value;
              return (
                <li key={time}>
                  <button
                    type="button"
                    data-selected={isSelected}
                    disabled={disabled}
                    onClick={() => {
                      onChange(time);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full px-3.5 py-1.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-indigo-600 text-white font-bold"
                        : "font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
                      disabled && "opacity-30 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {time}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TimePicker;
