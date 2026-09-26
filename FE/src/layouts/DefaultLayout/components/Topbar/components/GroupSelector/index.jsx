import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ChevronDown, Users, Check, Home } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { CreateGroupModal } from "~/components/Modals";
import { useClickOutside } from "~/hooks";

function GroupSelector({ workspaces, activeWorkspace, onChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false));

  const isHome = !activeWorkspace;

  return (
    <>
      <div ref={ref} className="relative shrink-0">
        <Button
          variant="ghost"
          size="default"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((p) => !p)}
          className="gap-2 px-3 text-slate-700 font-medium min-w-[160px] justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            {isHome ? (
              <Home size={16} className="text-indigo-600 shrink-0" />
            ) : (
              <Users size={16} className="text-indigo-600 shrink-0" />
            )}
            <span className="max-w-[130px] truncate">
              {isHome ? t("topbar.home") : activeWorkspace.name}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              "text-slate-400 transition-transform duration-200 shrink-0",
              open && "rotate-180"
            )}
          />
        </Button>

        {open && (
          <div className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Option: Trang chủ */}
            <div className="p-1 border-b border-slate-100">
              <Button
                variant="ghost"
                onClick={() => {
                  onChange?.(null);
                  navigate("/");
                  setOpen(false);
                }}
                className={cn(
                  "w-full justify-start gap-3 px-3 py-2.5 h-auto font-normal",
                  isHome && "bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-medium"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px]",
                    isHome ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Home size={15} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium">{t("topbar.home")}</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    {t("groups.title")}
                  </div>
                </div>
                {isHome && <Check size={14} className="shrink-0 text-indigo-600" />}
              </Button>
            </div>

            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {t("topbar.yourWorkspaces")}
            </div>
            <div className="flex flex-col gap-0.5 p-1 max-h-60 overflow-y-auto">
              {workspaces.map((ws) => (
                <Button
                  key={ws.id}
                  variant="ghost"
                  onClick={() => {
                    onChange?.(ws);
                    navigate(`/groups/${ws.id}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2.5 h-auto font-normal",
                    activeWorkspace?.id === ws.id &&
                      "bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                      ws.role === "Owner"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {ws.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate font-medium">{ws.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {ws.role} · {t("topbar.membersCount", { count: ws.memberCount })}
                    </div>
                  </div>
                  {activeWorkspace?.id === ws.id && (
                    <Check size={14} className="shrink-0 text-indigo-600" />
                  )}
                </Button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateModalOpen(true);
                  setOpen(false);
                }}
                className="w-full justify-start gap-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer text-xs"
              >
                <span className="text-base leading-none">+</span>
                <span>{t("topbar.createNewGroup")}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateGroupModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </>
  );
}

export default GroupSelector;
