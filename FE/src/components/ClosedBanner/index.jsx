import { useTranslation } from "react-i18next";
import { CalendarX } from "lucide-react";

/**
 * Dải báo phiên đã quá hạn và bị tự đóng: thành viên chỉ xem, trưởng nhóm vẫn chốt hoặc gia hạn được.
 * lostLastEdit: server vừa từ chối lần lưu cuối vì phiên đã đóng.
 */
function ClosedBanner({ isLead = false, lostLastEdit = false }) {
  const { t } = useTranslation();
  // Câu "thay đổi cuối chưa được lưu" của thành viên đã gồm đủ ý banner nên không nối thêm, tránh lặp câu.
  const memberLostEdit = lostLastEdit && !isLead;
  return (
    <div
      role="status"
      className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-center text-xs font-semibold text-orange-800 sm:text-sm"
    >
      <CalendarX size={15} className="shrink-0" />
      <span className="min-w-0">
        {memberLostEdit
          ? t("saveStatus.closed")
          : t(isLead ? "closedSession.bannerLead" : "closedSession.bannerMember")}
        {lostLastEdit && isLead && ` ${t("saveStatus.closed")}`}
      </span>
    </div>
  );
}

export default ClosedBanner;
