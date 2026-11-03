import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";
import { useUserGroupRole } from "~/hooks/useUserGroupRole";

/**
 * MatrixHeader - Thanh tiêu đề trên cùng của trang Ma trận
 * Chịu trách nhiệm:
 * - Link quay lại nhóm
 * - Tên và mã refCode của phiên khảo sát
 * - Nút chuyển sang Chế độ Lead (/lead-matrix) - CHỈ hiển thị nếu có role Lead
 */
function MatrixHeader({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const { role: userGroupRole } = useUserGroupRole(groupId);
  const isLead = userGroupRole === "owner" || userGroupRole === "lead";
  const backUrl = groupId ? `/groups/${groupId}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-1 sm:mb-2.5 flex min-h-[36px] shrink-0 items-center justify-between gap-3 select-none">
      {/* Cụm link quay lại nhóm & tên session */}
      <div className="flex min-w-0 items-center gap-2.5 text-xs">
        <Link
          to={backUrl}
          aria-label={t("groupDetail.backToGroup")}
          className="group flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 transition-colors hover:text-red-600 max-sm:h-10 max-sm:rounded-xl max-sm:border max-sm:border-slate-200 max-sm:bg-white max-sm:px-3 max-sm:text-sm max-sm:text-slate-700 max-sm:shadow-2xs"
        >
          {/* Mobile: nút quay lại cao 40px, có chữ cho dễ bấm; desktop giữ breadcrumb gọn */}
          <ArrowLeft
            size={18}
            className="transition-transform group-hover:-translate-x-0.5 group-hover:text-red-600 sm:size-3.5"
          />
          <span className="sm:hidden">{t("common.back")}</span>
          <span className="hidden sm:inline">
            {t("groupDetail.backToGroup")}
          </span>
        </Link>
        <span className="hidden shrink-0 text-slate-300 sm:inline">/</span>
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate font-bold text-slate-900 max-sm:text-sm">
            {session?.title || ""}
          </span>
        </div>
      </div>

      {/* Nút chuyển đổi sang Chế độ Lead - Chỉ hiển thị cho người có role là Lead */}
      {isLead && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(`/groups/${groupId}/lead-matrix/${sessionSlug}`, { state: { session } })
          }
          className="h-8 cursor-pointer gap-1.5 rounded-xl border-indigo-200/90 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
        >
          <Shield size={14} className="text-indigo-600" />
          <span>{t("matrix.switchToLeadMode")}</span>
        </Button>
      )}
    </div>
  );
}

export default MatrixHeader;
