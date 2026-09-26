import { useTranslation } from "react-i18next";
import { Settings, ShieldCheck, Link2 } from "lucide-react";
import { Button } from "~/components/ui/button";

function GroupSettings({ group }) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Settings size={28} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">
        Cài đặt nhóm & Tích hợp CalDAV
      </h3>
      <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
        {t("groupDetail.settingsComingSoon")}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button
          variant="outline"
          className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 min-w-[150px] justify-center"
        >
          <Link2 size={14} />
          <span>Sao chép link mời</span>
        </Button>
      </div>
    </div>
  );
}

export default GroupSettings;
