import { memo } from "react";
import { cn } from "~/lib/utils";
import MemberAvatar from "../MemberAvatar";
import { hasResponded } from "~/utils/members";

/**
 * MemberChip - Một thành viên trên dải xem thành viên (chỉ để xem, không bấm chọn).
 * compact (nhóm đông): chỉ hiện ảnh tròn, tên ở tooltip, để cả nhóm nằm trên 1 hàng. Chưa nhập lịch: viền nét đứt.
 */
function MemberChip({ member, compact, notRespondedLabel }) {
  const name = member.memberName || "Thành viên";
  const responded = hasResponded(member);
  const title = responded ? name : `${name} · ${notRespondedLabel}`;
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "shrink-0 select-none border border-indigo-200 bg-indigo-50 text-indigo-700",
        compact ? "h-8 w-8 rounded-full p-0.5" : "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        !responded && "border-dashed border-slate-300 bg-slate-50 text-slate-500"
      )}
    >
      <MemberAvatar
        name={name}
        avatarUrl={member.avatarUrl}
        muted={!responded}
        className={compact ? "h-full w-full text-[11px]" : "h-4.5 w-4.5 text-[10px]"}
      />
      {!compact && <span className="max-w-[110px] truncate">{name}</span>}
    </span>
  );
}

export default memo(MemberChip);
