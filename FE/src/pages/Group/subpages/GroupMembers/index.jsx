import { useTranslation } from "react-i18next";
import { Users, UserPlus, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";

function GroupMembers({ group }) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Users size={28} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">
        Danh sách thành viên ({group?.memberCount || 12} thành viên)
      </h3>
      <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
        {t("groupDetail.membersComingSoon")}
      </p>
      <div className="mt-6 flex justify-center">
        <Button
          variant="outline"
          className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 min-w-[140px] justify-center"
        >
          <UserPlus size={14} />
          <span>{t("groupDetail.inviteMembers")}</span>
        </Button>
      </div>
    </div>
  );
}

export default GroupMembers;
