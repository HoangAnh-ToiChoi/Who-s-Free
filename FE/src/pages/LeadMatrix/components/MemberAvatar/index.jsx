import { useState } from "react";
import { cn } from "~/lib/utils";

/**
 * MemberAvatar - Ảnh tròn của thành viên; không có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu của tên.
 * Kích thước do className quyết định (vd "h-7 w-7"); muted: nền xám cho người đang bị bỏ chọn / chưa nhập lịch.
 */
function MemberAvatar({ name, avatarUrl, muted = false, className }) {
  const [imgError, setImgError] = useState(false);
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setImgError(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        muted ? "bg-slate-200 text-slate-500" : "bg-indigo-200 text-indigo-800",
        className
      )}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default MemberAvatar;
