import { cn } from "~/lib/utils";

/**
 * GroupTabs - Tab Lịch trình / Thành viên / Cài đặt của trang nhóm.
 * Mobile: thanh chuyển đổi dạng segmented, tab Cài đặt ẩn vì đã có nút bánh răng trên thanh đầu trang.
 */
function GroupTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto max-sm:rounded-xl max-sm:bg-slate-100 max-sm:p-1 sm:border-b sm:border-slate-200 sm:pt-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              "flex items-center justify-center gap-2 px-4 text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap",
              "max-sm:h-9 max-sm:flex-1 max-sm:rounded-lg sm:h-9 sm:border-b-2",
              tab.minW,
              tab.id === "settings" && "max-sm:hidden",
              isActive
                ? "text-indigo-700 font-bold max-sm:bg-white max-sm:text-slate-900 max-sm:shadow-xs sm:border-indigo-600"
                : "text-slate-500 sm:border-transparent sm:hover:border-slate-300 hover:text-slate-800"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-200/70 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default GroupTabs;
