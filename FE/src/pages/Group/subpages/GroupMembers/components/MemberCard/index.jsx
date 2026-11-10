import { useState } from "react";
import { Crown, LogOut, Shield, ShieldPlus, User, UserMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import ActionMenu from "~/components/ActionMenu";

const ROLE_BADGE = {
  owner: { icon: Crown, className: "border-amber-200/70 bg-amber-50 text-amber-700" },
  lead: { icon: Shield, className: "border-indigo-200/60 bg-indigo-50 text-indigo-600" },
};

/**
 * permissions: { isSelf, canPromote, canRemove, canLeave } — tính sẵn ở cha theo luật BE.
 * Lead không có mục hạ quyền: BE chỉ hỗ trợ nâng một chiều.
 */
function MemberCard({ member, role = "member", permissions = {}, isManager = false, onAction }) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const name = member?.name || t("groupDetail.roleMember", { defaultValue: "Thành viên" });
  const initial = name.charAt(0).toUpperCase() || "U";
  const hasAvatar = Boolean(member?.avatarUrl) && !imageError;
  const badge = ROLE_BADGE[role];
  const BadgeIcon = badge?.icon;
  const badgeLabel = role === "owner"
    ? t("groupDetail.roleOwner", { defaultValue: "Owner" })
    : t("groupDetail.roleLead", { defaultValue: "Lead" });

  const menuItems = [
    { key: "promote", label: t("memberActions.promote"), icon: ShieldPlus, hidden: !permissions.canPromote, onSelect: () => onAction?.("promote", member) },
    { key: "remove", label: t("memberActions.remove"), icon: UserMinus, danger: true, hidden: !permissions.canRemove, onSelect: () => onAction?.("remove", member) },
    { key: "leave", label: t("memberActions.leave"), icon: LogOut, danger: true, hidden: !permissions.canLeave, onSelect: () => onAction?.("leave", member) },
  ];

  return (
    <div className="flex min-w-0 items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-sm">
      {hasAvatar ? (
        <img
          src={member.avatarUrl}
          alt={name}
          onError={() => setImageError(true)}
          className="h-11 w-11 shrink-0 rounded-full border border-slate-100 object-cover shadow-2xs"
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-100/80 bg-gradient-to-br from-indigo-100/90 to-indigo-50 font-bold text-sm text-indigo-700 shadow-2xs"
          aria-label={name}
        >
          {initial || <User size={18} className="text-indigo-600" />}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-slate-900 truncate tracking-tight">
          {name}
        </h4>

        {badge && (
          <div className="mt-0.5 flex items-center">
            <span
              title={role === "lead" && isManager ? t("memberActions.lockedLead") : undefined}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold shadow-2xs ${badge.className}`}
            >
              <BadgeIcon size={10} className="shrink-0" />
              <span>{badgeLabel}</span>
            </span>
          </div>
        )}

        {member?.email && (
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {member.email}
          </p>
        )}
      </div>

      <ActionMenu items={menuItems} label={t("memberActions.menu")} className="-mr-1.5 self-start" />
    </div>
  );
}

export default MemberCard;
