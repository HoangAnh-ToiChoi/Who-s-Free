import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * MatrixHeader - Thanh tiêu đề trên cùng của trang Ma trận
 * Chịu trách nhiệm:
 * - Link quay lại nhóm
 * - Tên và mã refCode của phiên khảo sát
 * - Nút chuyển sang Chế độ Lead (/lead-matrix)
 */
function MatrixHeader({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const groupTarget = session?.groupSlug || session?.groupId || "ws-1";
  const sessionSlug = session?.slug || session?.id || "";

  return (
    <div className="mb-2.5 shrink-0 min-h-[36px] flex items-center justify-between gap-3 select-none">
      {/* Cụm link quay lại nhóm & tên session */}
      <div className="flex items-center gap-2.5 text-xs min-w-0">
        <Link
          to={`/groups/${groupTarget}`}
          className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-semibold transition-colors shrink-0 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">{t("groupDetail.backToGroup")}</span>
        </Link>
        <span className="text-slate-300 shrink-0">/</span>
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
          <span className="font-bold text-slate-900 truncate">
            {session?.title || ""}
          </span>
          {session?.refCode && (
            <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">
              ({session.refCode})
            </span>
          )}
        </div>
      </div>

      {/* Nút chuyển đổi sang Chế độ Lead */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => navigate(`/lead-matrix?session=${sessionSlug}`)}
        className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] bg-white text-indigo-700 border-indigo-200/90 hover:bg-indigo-50 hover:border-indigo-300"
      >
        <Shield size={14} className="text-indigo-600" />
        <span>{t("matrix.switchToLeadMode")}</span>
      </Button>
    </div>
  );
}

export default MatrixHeader;
