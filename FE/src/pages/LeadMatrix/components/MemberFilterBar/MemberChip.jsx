import { useState } from "react";
import { cn } from "~/lib/utils";

/**
 * MemberChip - Thành phần nút chip hiển thị thông tin từng thành viên trong bộ lọc
 * Có avatar, tên và trạng thái chọn/bỏ chọn (ẩn mờ khi không chọn, không dùng gạch ngang).
 */
function MemberChip({ member, isSelected, onToggle }) {
  const [imgError, setImgError] = useState(false);
  const name = member.memberName || "Thành viên";
  const initial = name.charAt(0).toUpperCase() || "M";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border select-none",
        isSelected
          ? "bg-indigo-50 text-indigo-700 border-indigo-200/90 shadow-2xs hover:bg-indigo-100/70 font-semibold"
          : "bg-slate-50/80 text-slate-400 border-slate-200/60 opacity-40 hover:opacity-75 grayscale hover:grayscale-0 font-normal"
      )}
    >
      {member.avatarUrl && !imgError ? (
        <img
          src={member.avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className={cn(
            "h-4.5 w-4.5 rounded-full object-cover shrink-0 transition-opacity",
            !isSelected && "opacity-60"
          )}
        />
      ) : (
        <span
          className={cn(
            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
            isSelected
              ? "bg-indigo-200 text-indigo-800"
              : "bg-slate-200 text-slate-500"
          )}
        >
          {initial}
        </span>
      )}
      <span className="truncate max-w-[110px]">{name}</span>
    </button>
  );
}

export default MemberChip;
