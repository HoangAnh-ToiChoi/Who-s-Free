import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { CAPACITY_OPTIONS } from "~/constants/groupCapacity";
import { cn } from "~/lib/utils";

/** Chọn sức chứa nhóm 5/10/20/30. Nấc nhỏ hơn số thành viên hiện có bị khoá. value/onChange dạng chuỗi ("10"). */
function CapacityPicker({ value, onChange, memberCount = 0 }) {
  const { t, i18n } = useTranslation();
  const isVietnamese = i18n.language?.startsWith("vi");
  const hasTooSmallOption = CAPACITY_OPTIONS.some((opt) => Number(opt.value) < memberCount);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CAPACITY_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={Number(opt.value) < memberCount}
              aria-pressed={isSelected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border px-2 py-1.5 text-center text-xs transition-all select-none disabled:cursor-not-allowed disabled:opacity-40",
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 font-bold text-indigo-700 shadow-2xs ring-1 ring-indigo-500/20"
                  : "border-slate-200 bg-slate-50/50 font-medium text-slate-600 enabled:hover:border-slate-300 enabled:hover:bg-white"
              )}
            >
              {isVietnamese ? opt.viLabel : opt.label}
            </button>
          );
        })}
      </div>
      {hasTooSmallOption && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{t("groupActions.capacityTooSmall", { count: memberCount })}</span>
        </p>
      )}
    </div>
  );
}

export default CapacityPicker;
