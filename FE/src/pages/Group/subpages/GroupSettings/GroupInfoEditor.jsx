import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CapacityPicker } from "~/components/GroupManage";
import { groupService } from "~/service/groupService/groupService";
import { useGroups } from "~/hooks";

const LABEL_CLASS = "text-xs font-semibold text-slate-600";

/** Owner/lead sửa tên + sức chứa nhóm ngay trong tab Cài đặt. Chỉ gửi trường đã đổi. */
function GroupInfoEditor({ group, onChanged }) {
  const { t } = useTranslation();
  const { loadGroups } = useGroups();
  const [name, setName] = useState(group.name || "");
  const [capacity, setCapacity] = useState(String(group.capacity ?? ""));
  const [status, setStatus] = useState({ saving: false, saved: false, error: "" });

  const trimmed = name.trim();
  const payload = {};
  if (trimmed && trimmed !== group.name) payload.name = trimmed;
  if (capacity && capacity !== String(group.capacity)) payload.capacity = Number(capacity);
  const isDirty = Object.keys(payload).length > 0;

  const save = async (e) => {
    e.preventDefault();
    if (!trimmed) return setStatus({ saving: false, saved: false, error: t("createGroupModal.errorNameRequired") });
    if (!isDirty) return;
    setStatus({ saving: true, saved: false, error: "" });
    try {
      await groupService.updateGroup(group.id, payload);
      setStatus({ saving: false, saved: true, error: "" });
      onChanged?.();
      loadGroups?.();
    } catch (err) {
      setStatus({ saving: false, saved: false, error: err?.message || t("manage.failed") });
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <label htmlFor="settings-group-name" className={LABEL_CLASS}>{t("groupDetail.groupName")}</label>
        <Input
          id="settings-group-name"
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value);
            setStatus((s) => ({ ...s, saved: false }));
          }}
          className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className={LABEL_CLASS}>{t("groupDetail.capacityLabel")}</span>
          <span className="text-xs text-slate-500">
            {t("groupActions.currentMembers", { count: Number(group.memberCount) || 0 })}
          </span>
        </div>
        <div className="mt-1">
          <CapacityPicker
            value={capacity}
            onChange={(value) => {
              setCapacity(value);
              setStatus((s) => ({ ...s, saved: false }));
            }}
            memberCount={Number(group.memberCount) || 0}
          />
        </div>
      </div>

      {status.error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-medium text-rose-600">
          <AlertCircle size={15} className="shrink-0" />
          {status.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {status.saved && !isDirty && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check size={14} /> {t("manage.saved")}
          </span>
        )}
        <Button
          type="submit"
          disabled={!isDirty || status.saving}
          className="h-9.5 min-w-[130px] cursor-pointer justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status.saving && <Loader2 size={14} className="animate-spin" />}
          {t(status.saving ? "manage.saving" : "manage.save")}
        </Button>
      </div>
    </form>
  );
}

export default GroupInfoEditor;
