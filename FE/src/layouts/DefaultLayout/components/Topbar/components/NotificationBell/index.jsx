import { Bell } from "lucide-react";
import { Button } from "~/components/ui/button";

function NotificationBell({ count = 0, onClick, ...props }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      className="relative cursor-pointer rounded-xl text-slate-600 hover:text-slate-900"
      {...props}
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold ring-2 ring-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );
}

export default NotificationBell;
