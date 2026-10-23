import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { formatDateLabel, formatMinutes, formatRange, nextSelection } from "~/utils/finalizeCandidates";

function FinalizeForm({ cells, isSubmitting, error, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState(null);
  const [note, setNote] = useState("");

  const cellKeys = new Set(cells.map((c) => `${c.date}|${c.start}`));
  const dates = [...new Set(cells.map((c) => c.date))];
  const maxCount = Math.max(...cells.map((c) => c.count));

  const payload = selection
    ? { date: selection.date, startMinutes: selection.start, endMinutes: selection.end }
    : null;

  const isSelected = (cell) =>
    selection && selection.date === cell.date && cell.start >= selection.start && cell.end <= selection.end;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-600">{t("finalize.pickRun")}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{t("finalize.pickHint")}</p>

        <div className="mt-2 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
          {dates.map((date) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-bold text-slate-800">{formatDateLabel(date)}</p>
              <div className="flex flex-wrap gap-1.5">
                {cells
                  .filter((c) => c.date === date)
                  .map((cell) => (
                    <button
                      key={cell.start}
                      type="button"
                      aria-pressed={Boolean(isSelected(cell))}
                      onClick={() => setSelection((prev) => nextSelection(prev, cell, cellKeys))}
                      className={`flex cursor-pointer flex-col items-center rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        isSelected(cell)
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : cell.count === maxCount
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{formatRange(cell.start, cell.end)}</span>
                      <span className={`text-[10px] font-medium ${isSelected(cell) ? "text-indigo-100" : "text-slate-400"}`}>
                        {t("finalize.peopleCount", { count: cell.count })}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${selection ? "bg-indigo-50 text-indigo-800" : "bg-slate-50 text-slate-500"}`}>
        {selection
          ? t("finalize.selected", {
              when: `${formatDateLabel(selection.date)}, ${formatMinutes(selection.start)} - ${formatMinutes(selection.end)}`,
            })
          : t("finalize.nothingSelected")}
      </p>

      <label className="text-xs font-semibold text-slate-600">
        {t("finalize.note")}
        <textarea
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("finalize.notePlaceholder")}
          rows={2}
          className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("finalize.confirmHint")}</p>
      {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose} className="cursor-pointer rounded-xl">
          {t("finalize.cancel")}
        </Button>
        <Button
          type="button"
          disabled={isSubmitting || !payload}
          onClick={() => payload && onSubmit({ ...payload, note })}
          className="cursor-pointer gap-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Lock size={14} />
          {isSubmitting ? t("finalize.submitting") : t("finalize.confirm")}
        </Button>
      </div>
    </div>
  );
}

/**
 * FinalizeModal - Lead bấm chọn trực tiếp khung giờ chốt trong các ô giờ nhóm đã chọn, kèm ghi chú cuối bảng Excel
 */
function FinalizeModal({ open, onOpenChange, cells, isLoading, isSubmitting, error, onSubmit }) {
  const { t } = useTranslation();

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("finalize.modalTitle")}
      subtitle={t("finalize.modalSubtitle")}
      icon={<Lock size={18} className="text-indigo-600" />}
      maxWidth="sm:max-w-[520px]"
    >
      {isLoading ? (
        <p className="mt-5 text-sm text-slate-500">{t("finalize.loading")}</p>
      ) : cells.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{t("finalize.noRuns")}</p>
      ) : (
        // key theo danh sách ô để form khởi tạo lại mỗi lần mở với dữ liệu mới
        <FinalizeForm
          key={cells.map((c) => `${c.date}${c.start}${c.count}`).join("|")}
          cells={cells}
          isSubmitting={isSubmitting}
          error={error}
          onClose={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      )}
    </BaseModal>
  );
}

export default FinalizeModal;
