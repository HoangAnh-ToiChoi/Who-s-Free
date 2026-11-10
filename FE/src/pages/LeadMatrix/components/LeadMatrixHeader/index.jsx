import { useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";
import FinalizedBanner from "~/pages/LeadMatrix/components/FinalizedBanner";
import WeekNav from "~/pages/MemberMatrix/components/GridToolbar/WeekNav";
import BackButton from "~/components/BackButton";
import SessionNoteChip from "~/components/SessionNoteChip";

/**
 * LeadMatrixHeader - Header trang LeadMatrix cho Trưởng nhóm
 * - Link quay lại nhóm
 * - Tên session + ref code
 * - Nút chuyển sang MemberMatrix (Nhập lịch của tôi)
 */
function LeadMatrixHeader({ session, hideSwitch = false, finalized = null, readOnly = false, weekNav, onNoteSaved }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLeadRoute = useLocation().pathname.includes("/lead-matrix");

  const { groupId } = useParams();
  const backUrl = groupId ? `/groups/${groupId}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-1 sm:mb-2.5 flex flex-wrap min-h-9 shrink-0 items-center gap-x-3 gap-y-2 select-none md:grid md:grid-cols-[1fr_auto_1fr]">
      {/* Breadcrumb: Back to group → Session title */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs md:flex-none">
        <BackButton to={backUrl} label={t("groupDetail.backToGroup")} shortLabel={t("common.back")} />
        <span className="hidden shrink-0 text-slate-300 sm:inline">/</span>
        {/* Mobile: hàng đầu = [←] [‹ Hôm nay ›] [📅]; tên phiên ẩn để nhường chỗ */}
        {weekNav && <WeekNav {...weekNav} className="mx-auto sm:hidden" />}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 max-sm:hidden">
          <span className="truncate text-sm font-bold text-slate-900">
            {session?.title || ""}
          </span>

          {isLeadRoute && (
            <span className="ml-1 shrink-0 rounded-md border max-sm:hidden border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
              {t("leadMatrix.leaderView")}
            </span>
          )}
        </div>
        {/* Ghi chú của trưởng nhóm: hiện cả trên mobile (tên phiên bị ẩn) */}
        <SessionNoteChip session={session} canEdit={!readOnly} onSaved={onNoteSaved} />
      </div>

      {/* Nhãn lịch đã chốt: căn giữa header (màn hình hẹp thì xuống dòng riêng) */}
      <div className="flex md:justify-center max-md:order-last max-md:w-full">
        <FinalizedBanner finalized={finalized} readOnly={readOnly} />
      </div>

      {/* Nút chuyển sang MemberMatrix */}
      <div className="flex md:justify-end max-md:ml-auto">
      {!hideSwitch && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          navigate(`/groups/${groupId}/matrix/${sessionSlug}`, { state: { session } })
        }
        aria-label={t("leadMatrix.enterMySchedule")}
        className="h-10 sm:h-8 cursor-pointer gap-1.5 rounded-xl border-indigo-200/90 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
      >
        <Calendar size={14} className="text-indigo-600 max-sm:size-5" />
        <span className="max-sm:hidden">{t("leadMatrix.enterMySchedule")}</span>
      </Button>
      )}
      </div>
    </div>
  );
}

export default LeadMatrixHeader;
