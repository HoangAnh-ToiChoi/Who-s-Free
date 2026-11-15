import { useTranslation } from "react-i18next";
import { CalendarX } from "lucide-react";

/**
 * Dải báo phiên đã quá hạn và bị tự đóng: thành viên chỉ xem, trưởng nhóm vẫn chốt hoặc gia hạn được.
 * lostLastEdit: server vừa từ chối lần lưu cuối vì phiên đã đóng.
 */
function ClosedBanner({ isLead = false, lostLastEdit = false }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="mb-2 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-800 sm:text-sm"
    >
      <CalendarX size={15} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {t(isLead ? "closedSession.bannerLead" : "closedSession.bannerMember")}
        {lostLastEdit && ` ${t("saveStatus.closed")}`}
      </span>
    </div>
  );
}

export default ClosedBanner;
