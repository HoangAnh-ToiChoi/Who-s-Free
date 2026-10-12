import { useNavigate } from "react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";

/**
 * InviteSuccessCard - Hiển thị chúc mừng khi tham gia nhóm thành công
 */
export function InviteSuccessCard({ groupName, targetGroupId, groupData }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={32} strokeWidth={2.4} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {t("invitePage.successTitle", { defaultValue: "Chào mừng bạn gia nhập nhóm!" })}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("invitePage.successDesc", {
                groupName,
                defaultValue: `Bạn đã trở thành thành viên chính thức của nhóm "${groupName}".`,
              })}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              navigate(targetGroupId ? `/groups/${targetGroupId}` : "/", {
                state: { group: groupData },
              });
            }}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer gap-2"
          >
            <span>{t("invitePage.goToGroup", { defaultValue: "Đi tới không gian nhóm ngay" })}</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InviteSuccessCard;
