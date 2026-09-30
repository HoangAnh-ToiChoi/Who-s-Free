import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ChevronDown, Info, Zap, Check, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { useClickOutside } from "~/hooks";

import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const CAPACITY_OPTIONS = [
  { value: "5", label: "5 members", viLabel: "5 thành viên" },
  { value: "10", label: "10 members", viLabel: "10 thành viên" },
  { value: "20", label: "20 members", viLabel: "20 thành viên" },
];

const GROUP_CATEGORIES = [
  {
    id: "work",
    labelKey: "createGroupModal.workStudy",
    color: "indigo",
  },
  {
    id: "hangout",
    labelKey: "createGroupModal.hangoutChill",
    color: "emerald",
  },
  {
    id: "other",
    labelKey: "createGroupModal.otherActivity",
    color: "amber",
  },
];

function CreateGroupModal({
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
  isSubmitting: externalIsSubmitting = false,
}) {
  const { t, i18n } = useTranslation();
  const [groupName, setGroupName] = useState("");
  const [category, setCategory] = useState("work");
  const [capacity, setCapacity] = useState("10");
  const [selectOpen, setSelectOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const selectRef = useRef(null);

  const isVietnamese = i18n.language?.startsWith("vi");
  const isSubmitting = externalIsSubmitting || internalSubmitting;

  // Reset form when modal opens or closes
  useEffect(() => {
    if (open) {
      setGroupName("");
      setCategory("work");
      setCapacity("10");
      setErrorMessage("");
    }
  }, [open]);

  useClickOutside(selectRef, () => setSelectOpen(false));

  const selectedOption =
    CAPACITY_OPTIONS.find((opt) => opt.value === capacity) ||
    CAPACITY_OPTIONS[1];

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage(t("createGroupModal.errorNameRequired"));
      return;
    }

    setErrorMessage("");

    const payload = {
      name: trimmedName,
      capacity: parseInt(capacity, 10) || 10,
      category,
      color: category === "hangout" ? "emerald" : category === "other" ? "amber" : "indigo",
    };

    const submitFn = onSubmit || onSuccess;
    if (submitFn) {
      try {
        setInternalSubmitting(true);
        const result = await submitFn(payload);
        // If parent returns a result object with success: false, do not close
        if (result && result.success === false) {
          if (result.error) setErrorMessage(result.error);
          return;
        }
        onOpenChange?.(false);
      } catch (err) {
        setErrorMessage(
          err?.message || "Failed to create group. Please try again.",
        );
      } finally {
        setInternalSubmitting(false);
      }
    } else {
      onOpenChange?.(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("createGroupModal.title")}
      titleClassName="text-lg"
      icon={<Plus size={16} strokeWidth={2.5} />}
      maxWidth="sm:max-w-[460px]"
      className="gap-6"
    >
      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Field: Group Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {t("createGroupModal.groupName")}
          </label>
          <Input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t("createGroupModal.groupNamePlaceholder")}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            autoFocus
          />
        </div>

        {/* Field: Group Purpose / Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {t("createGroupModal.category")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GROUP_CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex min-h-[42px] items-center justify-center rounded-xl border px-2 py-1.5 text-xs transition-all cursor-pointer select-none text-center",
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-1 ring-indigo-500/20 font-bold shadow-2xs"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-white font-medium"
                  )}
                >
                  {t(cat.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Field: Member Limit / Capacity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {t("createGroupModal.memberLimit")}
            </label>
            <span className="text-xs text-slate-400">
              {t("createGroupModal.recommended")}
            </span>
          </div>

          <div ref={selectRef} className="relative">
            <button
              type="button"
              onClick={() => setSelectOpen((prev) => !prev)}
              className={cn(
                "flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 text-sm transition-all outline-none select-none",
                selectOpen
                  ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white",
              )}
            >
              <span className="font-normal text-slate-800">
                {isVietnamese ? selectedOption.viLabel : selectedOption.label}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-slate-400 transition-transform duration-200",
                  selectOpen && "rotate-180",
                )}
              />
            </button>

            {selectOpen && (
              <div className="animate-in fade-in slide-in-from-top-1 absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/60 duration-150">
                {CAPACITY_OPTIONS.map((opt) => {
                  const isSelected = opt.value === capacity;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCapacity(opt.value);
                        setSelectOpen(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-indigo-50 font-medium text-indigo-700"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <span>{isVietnamese ? opt.viLabel : opt.label}</span>
                      {isSelected && (
                        <Check size={14} className="text-indigo-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Helper note */}
          <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{t("createGroupModal.helperNote")}</span>
          </div>
        </div>

        {/* Callout Card: Auto-generated workspace */}
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Zap size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800">
                {t("createGroupModal.autoGenerated")}
              </span>
              <span className="text-xs text-slate-400">
                {t("createGroupModal.calDavSync")}
              </span>
            </div>
          </div>
          <span className="rounded-md border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
            {t("common.active")}
          </span>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="animate-in fade-in rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2 text-xs font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons - Cố định height và min-w chống giật */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => onOpenChange?.(false)}
            className="h-10 min-w-[80px] cursor-pointer justify-center px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 min-w-[140px] cursor-pointer justify-center gap-2 bg-indigo-600 px-5 font-medium whitespace-nowrap text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t("createGroupModal.creating")}</span>
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} />
                <span>{t("createGroupModal.createGroup")}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

export default CreateGroupModal;
