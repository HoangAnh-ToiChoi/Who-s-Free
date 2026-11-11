import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Layers, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { GroupManageDialogs } from "~/components/GroupManage";
import GroupInfoEditor from "./GroupInfoEditor";

const FIELD_CLASS = "mt-1 flex items-center h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800";

/**
 * Tab Cài đặt nhóm. Owner/lead sửa tên + sức chứa ngay tại đây; owner có thêm vùng xoá nhóm.
 * Thành viên thường chỉ xem. (Nút 3 chấm chỉ còn ở thẻ nhóm ngoài trang chủ và thẻ lịch trình.)
 */
function GroupSettings({ group, onChanged }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(null);
  const role = String(group?.userRole || group?.role || "").toLowerCase();
  const canManage = role === "owner" || role === "lead";

  return (
    <div className="mt-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{t("groupDetail.settingsTitle")}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{t("groupDetail.settingsDesc")}</p>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-5 sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layers size={16} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">{t("groupDetail.groupInfo")}</h3>
        </div>

        {canManage && group ? (
          <GroupInfoEditor key={group.id} group={group} onChanged={onChanged} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">{t("groupDetail.groupName")}</label>
              <div className={FIELD_CLASS}>{group?.name || ""}</div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">{t("groupDetail.capacityLabel")}</label>
              <div className={`${FIELD_CLASS} gap-1.5`}>
                <Users size={14} className="text-slate-400" />
                <span>{group?.memberCount || 0} / {group?.capacity || 0}</span>
              </div>
            </div>
          </div>
        )}

        {group?.description && (
          <div>
            <label className="text-xs font-semibold text-slate-600">{t("groupDetail.descriptionLabel")}</label>
            <div className="mt-1 min-h-[64px] p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs leading-relaxed text-slate-700">
              {group.description}
            </div>
          </div>
        )}
      </div>

      {role === "owner" && group && (
        <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t("groupActions.dangerZone")}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{t("groupActions.deleteDesc")}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog("delete")}
              className="h-9.5 shrink-0 cursor-pointer gap-1.5 rounded-xl border-rose-200 bg-rose-50/80 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-100 hover:text-rose-700"
            >
              <Trash2 size={14} />
              {t("groupActions.delete")}
            </Button>
          </div>
          <GroupManageDialogs group={group} mode={dialog} onModeChange={setDialog} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

export default GroupSettings;
