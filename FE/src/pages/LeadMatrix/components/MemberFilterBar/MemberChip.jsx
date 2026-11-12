import { memo } from "react";
import { cn } from "~/lib/utils";
import MemberAvatar from "../MemberAvatar";

/**
 * MemberChip - Một thành viên trên thanh lọc. memo + onToggle(memberId) ổn định → bấm chọn 1 người chỉ vẽ lại chip đó.
 * compact (nhóm đông): chỉ hiện ảnh tròn, tên ở tooltip, để cả nhóm nằm trên 1 hàng.
 * Chưa chọn: làm mờ (để bấm chọn lại). Chưa nhập lịch: viền nét đứt.
 */
function MemberChip({ member, isSelected, compact, notRespondedLabel, onToggle }) {
  const name = member.memberName || "Thành viên";
  const responded = member.slots?.length > 0;
  const title = responded ? name : `${name} · ${notRespondedLabel}`;
  return (
    <button
      type="button"
      onClick={() => onToggle(member.memberId)}
      title={title}
      aria-label={title}
      aria-pressed={isSelected}
      className={cn(
        "shrink-0 cursor-pointer select-none border transition-[opacity,box-shadow,background-color] duration-150",
        compact
          ? "h-8 w-8 rounded-full p-0.5"
          : "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        !responded && "border-dashed",
        isSelected
          ? cn(
              "border-indigo-300 bg-indigo-50 text-indigo-700",
              compact ? "ring-2 ring-indigo-500/70" : "font-semibold shadow-2xs hover:bg-indigo-100/70"
            )
          : "border-slate-200 bg-slate-50/80 text-slate-400 opacity-40 grayscale hover:opacity-75 hover:grayscale-0"
      )}
    >
      <MemberAvatar
        name={name}
        avatarUrl={member.avatarUrl}
        muted={!isSelected}
        className={compact ? "h-full w-full text-[11px]" : "h-4.5 w-4.5 text-[10px]"}
      />
      {!compact && <span className="max-w-[110px] truncate">{name}</span>}
    </button>
  );
}

export default memo(MemberChip);
