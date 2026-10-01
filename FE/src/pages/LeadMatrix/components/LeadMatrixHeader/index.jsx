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
    ? (session?.groupName ? createCompositeSlug(session.groupName, session.groupId) : session.groupId)
    : (session?.groupSlug || "");
  const backUrl = groupTarget ? `/groups/${groupTarget}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : (session?.slug || session?.id || "");

  return (
    <div className="mb-2.5 shrink-0 min-h-[36px] flex items-center justify-between gap-3 select-none">
      {/* Breadcrumb: Back to group → Session title */}
      <div className="flex items-center gap-2.5 text-xs min-w-0">
        <Link
          to={backUrl}
          className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-semibold transition-colors shrink-0 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">{t("groupDetail.backToGroup")}</span>
        </Link>
        <span className="text-slate-300 shrink-0">/</span>
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-bold text-slate-900 truncate">
            {session?.title || ""}
          </span>
          {session?.refCode && (
            <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">
              ({session.refCode})
            </span>
          )}
          <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
            {t("leadMatrix.leaderView")}
          </span>
        </div>
      </div>

      {/* Nút chuyển sang MemberMatrix */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => navigate(`/matrix/${sessionSlug}`, { state: { session } })}
        className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] bg-white text-indigo-700 border-indigo-200/90 hover:bg-indigo-50 hover:border-indigo-300"
      >
        <Calendar size={14} className="text-indigo-600" />
        <span>{t("leadMatrix.enterMySchedule")}</span>
      </Button>
    </div>
  );
}

export default LeadMatrixHeader;
