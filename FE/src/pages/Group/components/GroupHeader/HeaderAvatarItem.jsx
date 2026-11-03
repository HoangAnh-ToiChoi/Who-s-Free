import { useState } from "react";

function HeaderAvatarItem({ member, src }) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = typeof src === "string" ? src : member?.avatarUrl;
  const name = member?.name || "Thành viên";
  const initial = name.charAt(0).toUpperCase() || "U";
  const hasAvatar = Boolean(avatarUrl) && !imageError;

  if (hasAvatar) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImageError(true)}
        className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover shrink-0 select-none"
      />
    );
  }

  return (
    <div
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 font-bold text-[10px] text-indigo-700 ring-2 ring-white select-none"
      title={name}
    >
      {initial}
    </div>
  );
}

export default HeaderAvatarItem;
