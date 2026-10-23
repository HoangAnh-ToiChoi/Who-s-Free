import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";
import FinalizedBanner from "~/pages/LeadMatrix/components/FinalizedBanner";

/**
 * LeadMatrixHeader - Header trang LeadMatrix cho Trưởng nhóm
 * - Link quay lại nhóm
 * - Tên session + ref code
 * - Nút chuyển sang MemberMatrix (Nhập lịch của tôi)
 */
function LeadMatrixHeader({ session, hideSwitch = false, finalized = null, readOnly = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLeadRoute = useLocation().pathname.includes("/lead-matrix");

  const { groupId } = useParams();
  const backUrl = groupId ? `/groups/${groupId}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-2.5 grid min-h-9 shrink-0 items-center gap-x-3 gap-y-2 select-none md:grid-cols-[1fr_auto_1fr]">
      {/* Breadcrumb: Back to group → Session title */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
        <Link
          to={backUrl}
          className="group flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 transition-colors hover:text-red-600"
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-0.5 group-hover:text-red-600"
          />
          <span className="hidden sm:inline">
            {t("groupDetail.backToGroup")}
          </span>
        </Link>
        <span className="shrink-0 text-slate-300">/</span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="truncate font-bold text-slate-900">
            {session?.title || ""}
          </span>

          {isLeadRoute && (
            <span className="ml-1 shrink-0 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
              {t("leadMatrix.leaderView")}
            </span>
          )}
        </div>
      </div>

      {/* Nhãn lịch đã chốt: căn giữa header (màn hình hẹp thì xuống dòng riêng) */}
      <div className="flex md:justify-center">
        <FinalizedBanner finalized={finalized} readOnly={readOnly} />
      </div>

      {/* Nút chuyển sang MemberMatrix */}
      <div className="flex md:justify-end">
      {!hideSwitch && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          navigate(`/groups/${groupId}/matrix/${sessionSlug}`, { state: { session } })
        }
        className="h-8 cursor-pointer gap-1.5 rounded-xl border-indigo-200/90 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
      >
        <Calendar size={14} className="text-indigo-600" />
        <span>{t("leadMatrix.enterMySchedule")}</span>
      </Button>
      )}
      </div>
    </div>
  );
}

export default LeadMatrixHeader;
