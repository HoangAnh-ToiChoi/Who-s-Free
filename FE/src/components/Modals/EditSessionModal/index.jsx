import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Check, Loader2, AlertCircle, Lock } from "lucide-react";
import { formatDateRangeLabel } from "~/utils/dateUtils";
import DateRangeField from "~/components/Modals/CreateCalendarModal/DateRangeField";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

const TITLE_MAX = 150;
const LABEL_CLASS = "text-[11px] font-bold tracking-wider text-slate-500 uppercase";

function buildPayload(session, title, range, lang) {
  const payload = {};
  if (title !== session.title) payload.title = title;
  const rangeChanged = range?.end && (range.start !== session.startDate || range.end !== session.endDate);
  if (rangeChanged) {
    payload.startDate = range.start;
    payload.endDate = range.end;
    payload.dateRange = formatDateRangeLabel(range.start, range.end, lang);
  }
  return payload;
}

function EditSessionForm({ session, onOpenChange, onSubmit }) {
  const { t, i18n } = useTranslation();
  const isFinalized = session.status === "finalized";
  const [title, setTitle] = useState(session.title || "");
  const [dateRange, setDateRange] = useState(
    session.startDate && session.endDate ? { start: session.startDate, end: session.endDate } : null
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const rangeIncomplete = Boolean(dateRange?.start && !dateRange.end);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const trimmed = title.trim();
    if (!trimmed) return setError(t("createCalendarModal.errorTitleRequired"));
    if (rangeIncomplete) return setError("");

    const payload = buildPayload(session, trimmed, isFinalized ? null : dateRange, i18n.resolvedLanguage || i18n.language);
    if (Object.keys(payload).length === 0) return onOpenChange(false);

    setError("");
    setIsSaving(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || t("manage.failed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-session-title" className={LABEL_CLASS}>{t("sessionActions.titleLabel")}</label>
        <Input
          id="edit-session-title"
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("createCalendarModal.sessionTitlePlaceholder")}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-600 focus:bg-white"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>{t("sessionActions.dateLabel")}</span>
        <div inert={isFinalized} className={cn(isFinalized && "pointer-events-none opacity-60")}>
          <DateRangeField value={dateRange} onChange={setDateRange} hasError={submitted && rangeIncomplete} />
        </div>
        {isFinalized && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <Lock size={13} className="mt-0.5 shrink-0" />
            <span>{t("sessionActions.finalizedDateLocked")}</span>
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-medium text-rose-600">
          <AlertCircle size={15} className="shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <Button
          type="button"
          variant="ghost"
          disabled={isSaving}
          onClick={() => onOpenChange(false)}
          className="h-9 min-w-[70px] cursor-pointer justify-center px-3.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="h-9 min-w-[130px] cursor-pointer justify-center gap-2 whitespace-nowrap bg-indigo-600 px-4 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
          <span>{t(isSaving ? "manage.saving" : "manage.save")}</span>
        </Button>
      </div>
    </form>
  );
}

/** Sửa tên / khoảng ngày của một phiên. onSubmit(payload) chỉ nhận các trường đã đổi; ném lỗi để modal hiện message. */
function EditSessionModal({ open, onOpenChange, session, onSubmit }) {
  const { t } = useTranslation();

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("sessionActions.editTitle")}
      subtitle={t("sessionActions.editSubtitle")}
      icon={<Pencil size={16} strokeWidth={2.2} />}
      maxWidth="sm:max-w-[480px]"
      className="gap-5"
    >
      {session && <EditSessionForm key={session.id} session={session} onOpenChange={onOpenChange} onSubmit={onSubmit} />}
    </BaseModal>
  );
}

export default EditSessionModal;
