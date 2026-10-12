import { useState } from "react";
import { Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * MemberCard - Component hiển thị thông tin 1 thành viên trong nhóm
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Hiển thị ảnh đại diện (avatar với fallback chữ cái nếu ảnh rỗng/lỗi)
 *   - Hiển thị tên đầy đủ của thành viên
 *   - Hiển thị nhãn "Lead" nhỏ ở dưới tên nếu thành viên là Lead/Owner
 *   - Hiển thị email thành viên
 */
function MemberCard({ member }) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const name = member?.name || t("groupDetail.roleMember", { defaultValue: "Thành viên" });
  const initial = name.charAt(0).toUpperCase() || "U";
  const hasAvatar = Boolean(member?.avatarUrl) && !imageError;

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-sm">
      {/* 1. Ảnh đại diện kèm Fallback Avatar */}
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

      {/* 2. Thông tin Tên & Lead nhỏ ở dưới */}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-slate-900 truncate tracking-tight">
          {name}
        </h4>

        {/* Lead nhỏ ở dưới tên */}
        {member?.isLead && (
          <div className="mt-0.5 flex items-center">
            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200/60 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 shadow-2xs">
              <Shield size={10} className="text-indigo-600 shrink-0" />
              <span>{t("groupDetail.roleLead", { defaultValue: "Lead" })}</span>
            </span>
          </div>
        )}

        {/* Email nếu có */}
        {member?.email && (
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {member.email}
          </p>
        )}
      </div>
    </div>
  );
}

export default MemberCard;
