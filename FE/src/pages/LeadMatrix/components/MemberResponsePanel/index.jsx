import { useTranslation } from "react-i18next";
import { UserCheck, UserX } from "lucide-react";
import { cn } from "~/lib/utils";
import MemberAvatar from "../MemberAvatar";

function MemberRow({ member, responded, roleLabel }) {
  const name = member.memberName || "Thành viên";
  return (
    <li className="flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5">
      <MemberAvatar
        name={name}
        avatarUrl={member.avatarUrl}
        muted={!responded}
        className={cn("h-7 w-7 text-[11px]", !responded && "opacity-70")}
      />
      <span className={cn("min-w-0 flex-1 truncate text-xs font-semibold", responded ? "text-slate-800" : "text-slate-500")}>
        {name}
      </span>
      {roleLabel && (
        <span className="shrink-0 rounded-md border border-indigo-200/80 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
          {roleLabel}
        </span>
      )}
    </li>
  );
}

function Section({ icon: Icon, tone, title, members, responded, emptyText, roleLabel }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", tone)}>
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="ml-auto text-xs font-bold text-slate-400">{members.length}</span>
      </div>
      {members.length > 0 ? (
        <ul className="flex flex-col">
          {members.map((m) => (
            <MemberRow key={m.memberId} member={m} responded={responded} roleLabel={roleLabel(m.role)} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-xs text-slate-400">
          {emptyText}
        </p>
      )}
    </div>
  );
}

/**
 * MemberResponsePanel - Cột phải màn Lead: ai đã chọn lịch, ai chưa (ảnh + tên), để Lead biết cần nhắc ai.
 * responded / pending: lấy từ useMemberFilter (cùng nguồn với thanh lọc Ban lãnh đạo / thành viên).
 */
function MemberResponsePanel({ responded = [], pending = [] }) {
  const { t } = useTranslation();
  const total = responded.length + pending.length;
  const percent = total ? Math.round((responded.length / total) * 100) : 0;
  const roleLabel = (role) =>
    role === "owner" ? t("leadMatrix.roleOwner") : role === "lead" ? t("leadMatrix.roleLead") : null;

  return (
    <div className="flex w-full flex-col gap-4 select-none">
      <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold text-slate-600">
          {t("leadMatrix.respondedProgress", { count: responded.length, total })}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <Section
        icon={UserCheck}
        tone="border-emerald-200/80 bg-emerald-50 text-emerald-600"
        title={t("leadMatrix.respondedTitle")}
        members={responded}
        responded
        emptyText={t("leadMatrix.noneResponded")}
        roleLabel={roleLabel}
      />
      <Section
        icon={UserX}
        tone="border-amber-200/80 bg-amber-50 text-amber-600"
        title={t("leadMatrix.notRespondedTitle")}
        members={pending}
        responded={false}
        emptyText={t("leadMatrix.allResponded")}
        roleLabel={roleLabel}
      />
    </div>
  );
}

export default MemberResponsePanel;
