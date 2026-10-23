import { Link, useNavigate } from "react-router";
import { CheckCircle2, Clock, ShieldAlert, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * InviteStatusAlert - Hiển thị các thông báo trạng thái đặc biệt
 * (Đã là thành viên, Lời mời hết hạn, Lời mời bị thu hồi, Nhóm đầy)
 */
export function InviteStatusAlert({
  isAlreadyMember,
  isExpired,
  isRevoked,
  isGroupFull,
  groupId,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Nút về trang chủ theo chuẩn fe-guidelines (hover cả icon và text màu đỏ)
  const BackHomeButton = (
    <Link
      to="/"
      className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer group"
    >
      <ArrowLeft size={14} className="transition-colors group-hover:text-red-600" />
      <span className="transition-colors group-hover:text-red-600">
        {t("invitePage.backHome", { defaultValue: "Về trang chủ" })}
      </span>
    </Link>
  );

  // 1. Đã là thành viên
  if (isAlreadyMember) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800 text-left">
          <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
          <span>
            {t("invitePage.alreadyMemberDesc", {
              defaultValue: "Bạn đã là thành viên của nhóm này rồi.",
            })}
          </span>
        </div>
        <Button
          type="button"
          onClick={() => navigate(groupId ? `/groups/${groupId}` : "/")}
          className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer gap-2"
        >
          <span>{t("invitePage.goToGroup", { defaultValue: "Vào nhóm ngay" })}</span>
          <ArrowRight size={14} />
        </Button>
      </div>
    );
  }

  // 2. Lời mời hết hạn 24 giờ
  if (isExpired) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
          <Clock size={16} className="text-amber-600 shrink-0" />
          <span>
            {t("invitePage.expiredDesc", {
              defaultValue:
                "Lời mời này đã hết hạn (sau 24 giờ kể từ lúc tạo). Vui lòng liên hệ quản trị viên để nhận lời mời mới.",
            })}
          </span>
        </div>
        {BackHomeButton}
      </div>
    );
  }

  // 3. Lời mời đã bị thu hồi
  if (isRevoked) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-left">
          <ShieldAlert size={16} className="text-rose-600 shrink-0" />
          <span>
            {t("invitePage.revokedDesc", {
              defaultValue: "Lời mời này đã bị thu hồi bởi quản trị viên nhóm.",
            })}
          </span>
        </div>
        {BackHomeButton}
      </div>
    );
  }

  // 4. Nhóm đã đầy
  if (isGroupFull) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-left">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>
            {t("invitePage.groupFullDesc", {
              defaultValue: "Rất tiếc, nhóm này đã đạt số lượng thành viên tối đa.",
            })}
          </span>
        </div>
        {BackHomeButton}
      </div>
    );
  }

  return null;
}

export default InviteStatusAlert;
