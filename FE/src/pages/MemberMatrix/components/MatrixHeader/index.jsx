import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";
import { groupService } from "~/service/groupService/groupService";

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

  const [userGroupRole, setUserGroupRole] = useState(null);
  useEffect(() => {
    if (!groupId) return;
    groupService.getGroupById(groupId)
      .then((g) => setUserGroupRole(g?.userRole || null))
      .catch(() => {});
  }, [groupId]);

  const isLead = userGroupRole === "owner" || userGroupRole === "lead";
  const backUrl = groupId ? `/groups/${groupId}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-2.5 flex min-h-[36px] shrink-0 items-center justify-between gap-3 select-none">
      {/* Cụm link quay lại nhóm & tên session */}
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
