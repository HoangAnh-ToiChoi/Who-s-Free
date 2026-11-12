import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { formatDateLabel, formatMinutes } from "~/utils/finalizeCandidates";
import FinalizeSuggestions from "./FinalizeSuggestions";
import FinalizeTimeline from "./timeline";
import FinalizeSkeleton from "./FinalizeSkeleton";
import SlideIn from "~/components/SlideIn";
import { presentMemberIds } from "~/utils/finalizeTimeline";
import { hasResponded } from "~/utils/members";

function FinalizeForm({ cells, members, isSubmitting, error, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState(null);
  const [note, setNote] = useState("");

  // Ai rảnh trọn khung đang chọn (trên tổng số người đã nhập lịch)
  const presence = useMemo(() => {
    const ids = presentMemberIds(cells, selection);
    return {
      total: members.filter(hasResponded).length,
      names: members.filter((m) => ids.has(m.memberId)).map((m) => m.memberName),
    };
  }, [cells, members, selection]);

  const payload = selection
    ? { date: selection.date, startMinutes: selection.start, endMinutes: selection.end }
    : null;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <FinalizeSuggestions cells={cells} members={members} selection={selection} onPick={setSelection} />

      <FinalizeTimeline cells={cells} members={members} selection={selection} onSelect={setSelection} />

      <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${selection ? "bg-indigo-50 text-indigo-800" : "bg-slate-50 text-slate-500"}`}>
        {selection
          ? `${t("finalize.selected", {
              when: `${formatDateLabel(selection.date)}, ${formatMinutes(selection.start)} - ${formatMinutes(selection.end)}`,
            })} · ${t("finalize.countOfTotal", { count: presence.names.length, total: presence.total })}`
          : t("finalize.nothingSelected")}
        {selection && presence.names.length > 0 && (
          <p className="mt-0.5 font-medium text-slate-600">{t("finalize.availableNames", { names: presence.names.join(", ") })}</p>
        )}
      </div>

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
 * FinalizeModal - Lead chọn khung giờ chốt: bấm một gợi ý (tối ưu / hạn chế) hoặc bấm trực tiếp các ô giờ nhóm đã chọn,
 * kèm ghi chú cuối bảng Excel
 */
function FinalizeModal({ open, onOpenChange, cells, members, isLoading, isSubmitting, error, onSubmit }) {
  const { t } = useTranslation();

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("finalize.modalTitle")}
      subtitle={t("finalize.modalSubtitle")}
      icon={<Lock size={18} className="text-indigo-600" />}
      maxWidth="sm:max-w-[920px]"
    >
      {isLoading ? (
        <FinalizeSkeleton />
      ) : cells.length === 0 ? (
        <SlideIn>
          <p className="mt-5 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{t("finalize.noRuns")}</p>
        </SlideIn>
      ) : (
        // key theo danh sách ô để form khởi tạo lại (và trượt lên lại) mỗi lần mở với dữ liệu mới
        <SlideIn key={cells.map((c) => `${c.date}${c.start}${c.count}`).join("|")}>
          <FinalizeForm
            cells={cells}
            members={members}
            isSubmitting={isSubmitting}
            error={error}
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        </SlideIn>
      )}
    </BaseModal>
  );
}

export default FinalizeModal;
