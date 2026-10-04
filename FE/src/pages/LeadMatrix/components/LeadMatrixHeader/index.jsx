import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";

/**
 * LeadMatrixHeader - Header trang LeadMatrix cho Trưởng nhóm
 * - Link quay lại nhóm
 * - Tên session + ref code
 * - Nút chuyển sang MemberMatrix (Nhập lịch của tôi)
 */
function LeadMatrixHeader({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const groupTarget = session?.groupId
    ? session?.groupName
      ? createCompositeSlug(session.groupName, session.groupId)
      : session.groupId
    : session?.groupSlug || "";
  const backUrl = groupTarget ? `/groups/${groupTarget}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-2.5 flex min-h-[36px] shrink-0 items-center justify-between gap-3 select-none">
      {/* Breadcrumb: Back to group → Session title */}
      <div className="flex min-w-0 items-center gap-2.5 text-xs">
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
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate font-bold text-slate-900">
            {session?.title || ""}
          </span>

          <span className="ml-1 shrink-0 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
            {t("leadMatrix.leaderView")}
          </span>
        </div>
      </div>

      {/* Nút chuyển sang MemberMatrix */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          navigate(`/matrix/${sessionSlug}`, { state: { session } })
        }
        className="h-8 cursor-pointer gap-1.5 rounded-xl border-indigo-200/90 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
      >
        <Calendar size={14} className="text-indigo-600" />
        <span>{t("leadMatrix.enterMySchedule")}</span>
      </Button>
    </div>
  );
}

export default LeadMatrixHeader;
