import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarPlus,
  X,
  ChevronDown,
  Check,
  Loader2,
  Zap,
  Clock,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useClickOutside } from "~/hooks";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const DATE_RANGE_OPTIONS = [
  { id: "week-1", label: "Oct 20 – Oct 26, 2026 (Current Week)", viLabel: "20 Th10 – 26 Th10, 2026 (Tuần hiện tại)" },
  { id: "week-2", label: "Oct 27 – Nov 02, 2026 (Next Week)", viLabel: "27 Th10 – 02 Th11, 2026 (Tuần tới)" },
  { id: "week-3", label: "Nov 03 – Nov 09, 2026 (Sprint Cycle 3)", viLabel: "03 Th11 – 09 Th11, 2026 (Chu kỳ 3)" },
];

const QUORUM_GOALS = [
  { value: 70, label: "70% Quorum" },
  { value: 80, label: "80% High Quorum" },
  { value: 100, label: "100% Full Attendance" },
];

function validateCalendarForm(data, t) {
  if (!data.title?.trim()) {
    return {
      isValid: false,
      error: t("createCalendarModal.errorTitleRequired"),
    };
  }
  if (!data.dateRange) {
    return {
      isValid: false,
      error: t("createCalendarModal.errorDateRequired"),
    };
  }
  return { isValid: true, error: "" };
}

function formatCalendarPayload(formState, sessionTypes) {
  const selectedType =
    sessionTypes.find((t) => t.id === formState.selectedTypeId) ||
    sessionTypes[1];

  return {
    title: formState.title.trim(),
    tag: selectedType.tag,
    tagColor: selectedType.tagColor,
    dateRange: formState.dateRange,
    quorumPercent: formState.quorumPercent,
    location: formState.location.trim() || "Virtual / Campus Lab",
    description: formState.description?.trim() || "",
  };
}

function CreateCalendarModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting: externalIsSubmitting = false,
}) {
  const { t, i18n } = useTranslation();
  const isVietnamese = i18n.language?.startsWith("vi");

  const SESSION_TYPES = [
    {
      id: "executive",
      tag: "EXECUTIVE QUORUM",
      tagColor: "primary",
      label: t("createCalendarModal.executiveQuorum"),
      desc: t("createCalendarModal.executiveDesc"),
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    },
    {
      id: "technical",
      tag: "TECHNICAL SPRINT",
      tagColor: "secondary",
      label: t("createCalendarModal.technicalSprint"),
      desc: t("createCalendarModal.technicalDesc"),
      badgeStyle: "bg-purple-50 text-purple-700 border-purple-200/80",
    },
    {
      id: "outreach",
      tag: "EXTERNAL OUTREACH",
      tagColor: "tertiary",
      label: t("createCalendarModal.externalOutreach"),
      desc: t("createCalendarModal.externalDesc"),
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/80",
    },
  ];

  // Form states
  const [title, setTitle] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("technical");
  const [dateRange, setDateRange] = useState(
    isVietnamese ? DATE_RANGE_OPTIONS[1].viLabel : DATE_RANGE_OPTIONS[1].label
  );
  const [quorumPercent, setQuorumPercent] = useState(70);
  const [location, setLocation] = useState("MakerSpace Bay 3");
  const [errorMessage, setErrorMessage] = useState("");
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  // Dropdown date range state & click outside
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const dateDropdownRef = useRef(null);
  useClickOutside(dateDropdownRef, () => setDatePickerOpen(false));

  const isSubmitting = externalIsSubmitting || internalSubmitting;

  useEffect(() => {
    if (open) {
      setTitle("");
      setSelectedTypeId("technical");
      setDateRange(
        isVietnamese ? DATE_RANGE_OPTIONS[1].viLabel : DATE_RANGE_OPTIONS[1].label
      );
      setQuorumPercent(70);
      setLocation("MakerSpace Bay 3");
      setErrorMessage("");
    }
  }, [open, isVietnamese]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateCalendarForm({ title, dateRange }, t);
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      return;
    }
    setErrorMessage("");

    const payload = formatCalendarPayload(
      {
        title,
        selectedTypeId,
        dateRange,
        quorumPercent,
        location,
      },
      SESSION_TYPES
    );

    if (onSubmit) {
      try {
        setInternalSubmitting(true);
        const result = await onSubmit(payload);
        if (result && result.success === false) {
          if (result.error) setErrorMessage(result.error);
          return;
        }
        onOpenChange?.(false);
      } catch (err) {
        setErrorMessage(err?.message || "Failed to create calendar session.");
      } finally {
        setInternalSubmitting(false);
      }
    } else {
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl sm:max-w-[500px]"
      >
        {/* Header */}
        <DialogHeader className="gap-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600">
                <CalendarPlus size={18} strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {t("createCalendarModal.title")}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  {t("createCalendarModal.subtitle")}
                </p>
              </div>
            </div>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  className="-mr-2 -mt-1 h-9 w-9 cursor-pointer rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                />
              }
            >
              <X size={20} strokeWidth={2.2} />
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Form Body */}
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

          {/* Field: Session Type / Quorum Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {t("createCalendarModal.category")}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {SESSION_TYPES.map((type) => {
                const isSelected = selectedTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedTypeId(type.id)}
                    className={cn(
                      "flex min-h-[76px] flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500/20"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase whitespace-nowrap",
                        type.badgeStyle
                      )}
                    >
                      {type.tag}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800">
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field: Date Range Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {t("createCalendarModal.pollingWindow")}
            </label>
            <div ref={dateDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDatePickerOpen((prev) => !prev)}
                className={cn(
                  "flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 text-sm transition-all outline-none select-none",
                  datePickerOpen
                    ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
                )}
              >
                <div className="flex items-center gap-2 text-slate-800 text-xs">
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{dateRange}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-400 transition-transform duration-200 shrink-0",
                    datePickerOpen && "rotate-180"
                  )}
                />
              </button>

              {datePickerOpen && (
                <div className="absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
                  {DATE_RANGE_OPTIONS.map((opt) => {
                    const label = isVietnamese ? opt.viLabel : opt.label;
                    const isSelected = label === dateRange;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDateRange(label);
                          setDatePickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors",
                          isSelected
                            ? "bg-indigo-50 font-medium text-indigo-700"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <span className="truncate">{label}</span>
                        {isSelected && (
                          <Check size={14} className="text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Field: Quorum Goal & Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {t("createCalendarModal.quorumGoal")}
              </label>
              <div className="flex items-center gap-1.5">
                {QUORUM_GOALS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setQuorumPercent(q.value)}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                      quorumPercent === q.value
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {q.value}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {t("createCalendarModal.locationMode")}
              </label>
              <Input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. MakerSpace Bay 3"
                className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-800 hover:border-slate-300 hover:bg-white"
              />
            </div>
          </div>

          {/* Sync callout */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Zap size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800">
                  {t("createCalendarModal.calDavActive")}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t("createCalendarModal.calDavDesc")}
                </span>
              </div>
            </div>
            <span className="rounded-md bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {t("common.live")}
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2 text-xs font-medium text-red-600 animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons - Cố định height và min-width chống giật */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => onOpenChange?.(false)}
              className="h-9 min-w-[70px] cursor-pointer px-3.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 justify-center"
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
      </DialogContent>
    </Dialog>
  );
}

export default CreateCalendarModal;
