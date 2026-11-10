import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus, Check, Loader2, AlertCircle } from "lucide-react";
import { formatDateRangeLabel } from "~/utils/dateUtils";
import DateRangeField from "./DateRangeField";
import SessionDetailsFields from "./SessionDetailsFields";
import { getSessionTypes } from "./sessionTypes";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

function validateCalendarForm(data, t) {
  if (!data.title?.trim()) return { isValid: false, error: t("createCalendarModal.errorTitleRequired") };
  // Thiếu ngày: ô chọn ngày tự viền đỏ và hiện lỗi ngay bên dưới, không lặp lại ở hộp lỗi chung.
  if (!data.dateRange?.start || !data.dateRange?.end) return { isValid: false, error: "" };
  return { isValid: true, error: "" };
}

function formatCalendarPayload(formState, sessionTypes, lang) {
  const selectedType = sessionTypes.find((t) => t.id === formState.selectedTypeId) || sessionTypes[0];

  return {
    title: formState.title.trim(),
    tag: selectedType.tag,
    tagColor: selectedType.tagColor,
    dateRange: formatDateRangeLabel(formState.dateRange.start, formState.dateRange.end, lang),
    startDate: formState.dateRange.start,
    endDate: formState.dateRange.end,
    quorumPercent: formState.quorumPercent,
    location: formState.location.trim() || "Quán Cafe / Trực tuyến",
    description: formState.description?.trim() || "",
  };
}

function CreateCalendarFormBody({ onOpenChange, onSubmit, isSubmitting: externalIsSubmitting }) {
  const { t, i18n } = useTranslation();
  const isVietnamese = i18n.language?.startsWith("vi");

  const SESSION_TYPES = getSessionTypes(t, isVietnamese);

  const [title, setTitle] = useState("");
  // Danh mục sự kiện tạm ẩn khỏi form; phiên mới mặc định "Công việc & Học tập".
  const selectedTypeId = "work";
  const [dateRange, setDateRange] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [quorumPercent, setQuorumPercent] = useState(70);
  const [location, setLocation] = useState(
    isVietnamese ? "Quán Cafe / Trực tuyến" : "Coffee Shop / Online"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = externalIsSubmitting || internalSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    const validation = validateCalendarForm({ title, dateRange }, t);
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      return;
    }
    setErrorMessage("");

    const lang = i18n.resolvedLanguage || i18n.language;
    const formState = { title, selectedTypeId, dateRange, quorumPercent, location };
    const payload = formatCalendarPayload(formState, SESSION_TYPES, lang);
    const toMessage = (message) => (message === "Network Error" ? t("createCalendarModal.errorNetwork") : message);

    if (onSubmit) {
      try {
        setInternalSubmitting(true);
        const result = await onSubmit(payload);
        if (result && result.success === false) {
          if (result.error) setErrorMessage(toMessage(result.error));
          return;
        }
        onOpenChange?.(false);
      } catch (err) {
        setErrorMessage(toMessage(err?.message) || "Failed to create calendar session.");
      } finally {
        setInternalSubmitting(false);
      }
    } else {
      onOpenChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Field: Session Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {t("createCalendarModal.sessionTitle")}
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("createCalendarModal.sessionTitlePlaceholder")}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-600 focus:bg-white"
            autoFocus
          />
        </div>

        {/* Field: Date Range Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {t("createCalendarModal.pollingWindow")}
          </label>
          <DateRangeField
            value={dateRange}
            onChange={setDateRange}
            hasError={submitted && !dateRange?.end}
          />
        </div>

        <SessionDetailsFields
          quorumPercent={quorumPercent}
          onQuorumChange={setQuorumPercent}
          location={location}
          onLocationChange={setLocation}
        />

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-medium text-rose-600 animate-in fade-in flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => onOpenChange?.(false)}
            className="h-9 min-w-[70px] cursor-pointer px-3.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 justify-center"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 min-w-[140px] cursor-pointer gap-2 bg-indigo-600 px-4 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed justify-center whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t("createCalendarModal.creatingSession")}</span>
              </>
            ) : (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>{t("createCalendarModal.createSession")}</span>
              </>
            )}
          </Button>
        </div>
      </form>
  );
}

function CreateCalendarModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting: externalIsSubmitting = false,
}) {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (newOpen) => {
    if (newOpen) setFormKey((k) => k + 1);
    onOpenChange?.(newOpen);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("createCalendarModal.title")}
      subtitle={t("createCalendarModal.subtitle")}
      icon={<CalendarPlus size={18} strokeWidth={2.2} />}
      maxWidth="sm:max-w-[500px]"
      className="gap-5"
    >
      <CreateCalendarFormBody
        key={formKey}
        onOpenChange={handleOpenChange}
        onSubmit={onSubmit}
        isSubmitting={externalIsSubmitting}
      />
    </BaseModal>
  );
}

export default CreateCalendarModal;
