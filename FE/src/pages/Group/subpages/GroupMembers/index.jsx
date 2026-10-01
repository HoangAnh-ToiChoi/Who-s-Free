import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Shield, CheckCircle2, Clock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { groupService } from "~/service/groupService/groupService";

/**
 * GroupMembers - Subpage hiển thị danh sách thành viên thực tế của nhóm từ db.json
 */
function GroupMembers({ group, onOpenInvite }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      try {
        const data = await groupService.getMembers(group?.id);
        if (isMounted) {
          setMembers(data);
        }
      } catch (err) {
        console.warn("Failed to load members:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [group?.id]);

  return (
    <div className="mt-8 space-y-6">
      {/* Header section with count & Invite button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {t("groupDetail.tabMembers")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {members.length} / {group?.capacity || 20} {t("groupCard.members")}
          </p>
        </div>

        <Button
          type="button"
          onClick={onOpenInvite}
          className="gap-2 bg-indigo-600 px-4 py-2 font-medium text-white shadow-xs hover:bg-indigo-700 cursor-pointer h-9 text-xs rounded-xl"
        >
          <UserPlus size={14} />
          <span>{t("groupDetail.inviteMembers")}</span>
        </Button>
      </div>

      {/* Members List from db.json */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
            />
          ))}
        </div>
      ) : members.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="h-11 w-11 shrink-0 rounded-full border border-slate-100 object-cover shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {member.name}
                  </h4>
                  {member.role === "Lead Admin" && (
                    <Shield size={12} className="text-indigo-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {member.email}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {member.role}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                      member.isAvailable ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {member.isAvailable ? (
                      <CheckCircle2 size={11} className="text-emerald-500" />
                    ) : (
                      <Clock size={11} className="text-slate-400" />
                    )}
                    <span>{member.statusText}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <Users size={28} className="mx-auto text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {t("groupDetail.noMembersTitle", { defaultValue: "Chưa có thành viên" })}
          </h3>
        </div>
      )}
    </div>
  );
}

export default GroupMembers;
