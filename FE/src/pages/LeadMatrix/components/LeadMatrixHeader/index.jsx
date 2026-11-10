import { useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";
import FinalizedBanner from "~/pages/LeadMatrix/components/FinalizedBanner";
import WeekNav from "~/pages/MemberMatrix/components/GridToolbar/WeekNav";
import BackButton from "~/components/BackButton";
import { SessionNoteBanner, SessionNoteEditButton } from "~/components/SessionNote";

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
    <div className="mb-1 sm:mb-2.5 flex flex-wrap min-h-9 shrink-0 items-center gap-x-3 gap-y-2 select-none">
      {/* Breadcrumb: Back to group → Session title */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
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
      </div>

      {/* Hàng riêng, căn giữa: nhãn lịch đã chốt + ghi chú của trưởng nhóm (chỉ hiện khi có) */}
      {(finalized || session?.description) && (
        <div className="order-last flex w-full min-w-0 flex-wrap items-center justify-center gap-2">
          <FinalizedBanner finalized={finalized} readOnly={readOnly} />
          <SessionNoteBanner note={session?.description} />
        </div>
      )}

      {/* Nút ghi chú (lead) + chuyển sang MemberMatrix */}
      <div className="ml-auto flex items-center gap-2">
      {/* Mobile: nút ghi chú ở header; desktop nằm ngay trên Xuất file/Chốt lịch (LeadMatrix) */}
      {!readOnly && (
        <SessionNoteEditButton className="sm:hidden" sessionId={session?.id} note={session?.description || ""} onSaved={onNoteSaved} />
      )}
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
