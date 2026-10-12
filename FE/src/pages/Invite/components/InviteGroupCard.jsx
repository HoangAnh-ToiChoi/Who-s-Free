import { Users, Clock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * InviteGroupCard - Thẻ thông tin nhóm và người mời
 */
export function InviteGroupCard({ group, role, inviter }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Thông tin Nhóm */}
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-bold">
          <Users size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 select-none">
            <Sparkles size={11} />
            <span>{t("invitePage.invitedToJoin", { defaultValue: "Lời mời tham gia" })}</span>
          </span>
          <h2 className="text-base font-bold text-slate-900 truncate">
            {group?.name}
          </h2>
          {group?.description && (
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
              {group.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span>{t("invitePage.roleLabel", { defaultValue: "Vai trò:" })}</span>
            <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-white border border-indigo-200 text-indigo-700">
              {role === "lead"
                ? t("inviteModal.roleLead", { defaultValue: "Trưởng nhóm phụ (Lead)" })
                : t("inviteModal.roleMember", { defaultValue: "Thành viên (Member)" })}
            </span>
          </div>
        </div>
      </div>

      {/* Người mời & Thời hạn 24 giờ */}
      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
        <div className="truncate pr-2">
          <span className="text-slate-400">{t("invitePage.inviter", { defaultValue: "Người mời: " })}</span>
          <span className="font-semibold text-slate-700">{inviter?.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-500">
          <Clock size={13} className="text-slate-400" />
          <span>{t("invitePage.expiresNote", { defaultValue: "Hạn 24 giờ" })}</span>
        </div>
      </div>
    </div>
  );
}

export default InviteGroupCard;
