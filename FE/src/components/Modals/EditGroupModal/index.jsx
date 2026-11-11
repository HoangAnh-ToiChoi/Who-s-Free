import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Check, Loader2, AlertCircle, Info } from "lucide-react";
import { CAPACITY_OPTIONS } from "~/constants/groupCapacity";
import BaseModal from "~/components/Modals/BaseModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

const NAME_MAX = 100;
const LABEL_CLASS = "text-[11px] font-bold tracking-wider text-slate-500 uppercase";

function EditGroupForm({ group, onOpenChange, onSubmit }) {
  const { t, i18n } = useTranslation();
  const isVietnamese = i18n.language?.startsWith("vi");
  const memberCount = Number(group.memberCount) || 0;
  const [name, setName] = useState(group.name || "");
  const [capacity, setCapacity] = useState(String(group.capacity ?? ""));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasTooSmallOption = CAPACITY_OPTIONS.some((opt) => Number(opt.value) < memberCount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(t("createGroupModal.errorNameRequired"));

    const payload = {};
    if (trimmed !== group.name) payload.name = trimmed;
    if (capacity !== String(group.capacity)) payload.capacity = Number(capacity);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-group-name" className={LABEL_CLASS}>{t("groupActions.nameLabel")}</label>
        <Input
          id="edit-group-name"
          type="text"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("createGroupModal.groupNamePlaceholder")}
          className="h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>{t("groupActions.capacityLabel")}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CAPACITY_OPTIONS.map((opt) => {
            const isSelected = capacity === opt.value;
            const tooSmall = Number(opt.value) < memberCount;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={tooSmall}
                aria-pressed={isSelected}
                onClick={() => setCapacity(opt.value)}
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
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{t("groupActions.capacityTooSmall", { count: memberCount })}</span>
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-medium text-rose-600">
          <AlertCircle size={15} className="shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <Button
          type="button"
          variant="ghost"
          disabled={isSaving}
          onClick={() => onOpenChange(false)}
          className="h-10 min-w-[80px] cursor-pointer justify-center px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="h-10 min-w-[140px] cursor-pointer justify-center gap-2 whitespace-nowrap bg-indigo-600 px-5 font-medium text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
          <span>{t(isSaving ? "manage.saving" : "manage.save")}</span>
        </Button>
      </div>
    </form>
  );
}

/** Sửa tên / sức chứa nhóm. onSubmit(payload) chỉ nhận các trường đã đổi; ném lỗi để modal hiện message. */
function EditGroupModal({ open, onOpenChange, group, onSubmit }) {
  const { t } = useTranslation();

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("groupActions.editTitle")}
      subtitle={t("groupActions.editSubtitle")}
      icon={<Pencil size={16} strokeWidth={2.2} />}
      maxWidth="sm:max-w-[460px]"
      className="gap-6"
    >
      {group && <EditGroupForm key={group.id} group={group} onOpenChange={onOpenChange} onSubmit={onSubmit} />}
    </BaseModal>
  );
}

export default EditGroupModal;
