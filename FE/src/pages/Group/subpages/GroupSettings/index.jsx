import { useTranslation } from "react-i18next";
import { Users, Layers } from "lucide-react";

function GroupSettings({ group }) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {t("groupDetail.settingsTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {t("groupDetail.settingsDesc")}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layers size={16} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {t("groupDetail.groupInfo")}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              {t("groupDetail.groupName")}
            </label>
            <div className="mt-1 flex items-center h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800">
              {group?.name || ""}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              {t("groupDetail.groupSlug")}
            </label>
            <div className="mt-1 flex items-center h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60 font-mono text-xs text-slate-600">
              {group?.slug || group?.id || ""}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              {t("groupDetail.cohortLabel")}
            </label>
            <div className="mt-1 flex items-center h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800">
              {group?.cohort || "N/A"}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              {t("groupDetail.capacityLabel")}
            </label>
            <div className="mt-1 flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800">
              <Users size={14} className="text-slate-400" />
              <span>
                {group?.memberCount || 0} / {group?.capacity || 0}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">
            {t("groupDetail.descriptionLabel")}
          </label>
          <div className="mt-1 min-h-[64px] p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs leading-relaxed text-slate-700">
            {group?.description || ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupSettings;
