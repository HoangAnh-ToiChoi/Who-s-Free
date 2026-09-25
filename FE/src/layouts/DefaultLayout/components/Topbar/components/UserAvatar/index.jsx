import { useState, useRef, useEffect } from "react";
import { LogOut, Settings, User } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

function UserAvatar({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger — giữ custom vì có ring effect */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "h-9 w-9 overflow-hidden rounded-full ring-2 transition-all focus:outline-none cursor-pointer",
          open ? "ring-primary" : "ring-slate-200 hover:ring-slate-300"
        )}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User info */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="h-9 w-9 overflow-hidden rounded-full shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{user?.name}</div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <Button variant="ghost" className="w-full justify-start gap-3 font-normal text-slate-700">
              <User size={15} className="text-slate-400" />
              Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 font-normal text-slate-700">
              <Settings size={15} className="text-slate-400" />
              Settings
            </Button>
          </div>

          <div className="border-t border-slate-100 p-1">
            <Button variant="destructive" className="w-full justify-start gap-3 font-normal">
              <LogOut size={15} />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserAvatar;
