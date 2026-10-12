import { useState } from "react";
import { useTranslation } from "react-i18next";

function MemberAvatar({ member }) {
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();
  const name = member.name || t("groupCard.memberFallback");
  const avatarUrl = member.avatarUrl;

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={name}
        onError={() => setImageError(true)}
        className="inline-block h-6 w-6 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  return (
    <div
      aria-label={name}
      title={name}
      className="inline-flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-[10px] font-bold text-indigo-700 ring-2 ring-white"
    >
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function MemberAvatarStack({ members = [], totalCount = 0 }) {
  const visibleMembers = members.slice(0, 3);
  const remainingCount = Math.max(0, totalCount - visibleMembers.length);

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden">
      {visibleMembers.map((member, index) => (
        <MemberAvatar key={member.id || index} member={member} />
      ))}
      {remainingCount > 0 && (
        <div
          aria-label={`+${remainingCount}`}
          className="flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white"
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default MemberAvatarStack;
