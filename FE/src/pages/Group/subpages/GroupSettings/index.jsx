import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Link2,
  Check,
  ShieldCheck,
  Users,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "~/components/ui/button";

function GroupSettings({ group }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/invite/${group?.slug || group?.id || ""}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  return (
    <div className="mt-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {t("groupDetail.settingsTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {t("groupDetail.settingsDesc")}
        </p>
      </div>

      {/* Group Information Card */}
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

      {/* Invite Link Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Link2 size={16} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {t("groupDetail.inviteLinkSection")}
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-mono text-xs text-slate-600 select-all focus:outline-none"
          />
          <Button
            type="button"
            onClick={handleCopy}
            className={`h-10 min-w-[150px] justify-center gap-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all ${
              copied
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} className="shrink-0" />
                <span>{t("groupDetail.copied")}</span>
              </>
            ) : (
              <>
                <Link2 size={14} className="shrink-0" />
                <span>{t("groupDetail.copyInviteLink")}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GroupSettings;
