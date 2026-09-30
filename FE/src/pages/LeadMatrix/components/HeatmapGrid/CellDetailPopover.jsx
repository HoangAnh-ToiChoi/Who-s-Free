import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";
import { minutesToTimeString } from "~/utils/timeUtils";

/**
 * CellDetailPopover - Popover hiển thị chi tiết ai rảnh/bận khi click vào ô heatmap
 */
function CellDetailPopover({ isOpen, cellData, blockStart, dayName, onClose }) {
  const { t } = useTranslation();

  if (!isOpen || !cellData) return null;

  const blockEnd = blockStart + 30;
  const timeRange = `${minutesToTimeString(blockStart)} – ${minutesToTimeString(blockEnd)}`;

  return (
    <div className="absolute z-50 top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 w-72 max-h-80 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-slate-900">{dayName} · {timeRange}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t("leadMatrix.availableCount", { count: cellData.count, total: cellData.totalMembers || 0 })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Member list */}
        {cellData.members && cellData.members.length > 0 ? (
          <div className="space-y-1.5">
            {cellData.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100"
              >
                <img
                  src={m.avatarUrl}
                  alt={m.name}
                  className="h-6 w-6 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-500">{m.role}</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold text-emerald-600 shrink-0">
                  {t("leadMatrix.statusFree")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">
            {t("leadMatrix.noOneAvailable")}
          </p>
        )}
      </div>
    </div>
  );
}

export default CellDetailPopover;
