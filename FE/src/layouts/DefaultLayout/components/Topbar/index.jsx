import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

import AppLogo from "./components/AppLogo";
import GroupSelector from "./components/GroupSelector";
import SearchBar from "./components/SearchBar";
import NotificationBell from "./components/NotificationBell";
import UserAvatar from "./components/UserAvatar";

import { mockWorkspaces, mockCurrentUser } from "~/data/mockData";

function Topbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // Kiểm tra xem hiện tại đang đứng ở chi tiết nhóm (/groups/:groupId) hay ở trang chủ/danh sách
  const groupMatch = location.pathname.match(/\/groups\/([^/]+)/);
  const currentGroupId = groupMatch ? groupMatch[1] : null;

  // Nếu không có groupId trong URL => Đang ở Trang chủ (chưa chọn nhóm nào)
  const activeWorkspace = currentGroupId
    ? mockWorkspaces.find((ws) => String(ws.id) === String(currentGroupId)) || {
        id: currentGroupId,
        name: `Group #${currentGroupId}`,
        role: "Member",
      }
    : null;

  const isVietnamese = i18n.language?.startsWith("vi");

  const toggleLanguage = () => {
    i18n.changeLanguage(isVietnamese ? "en" : "vi");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center border-b border-slate-200 bg-white px-8 sm:px-12 lg:px-16 py-4 shadow-xs">
      {/* Left section — Logo */}
      <div className="flex items-center shrink-0">
        <AppLogo />
      </div>

      {/* Center — SearchBar (Dịch nhẹ sang phải translate-x để cân bằng thị giác với cụm điều khiển bên phải) */}
      <div className="flex flex-1 items-center justify-center translate-x-6 sm:translate-x-12">
        <SearchBar />
      </div>

      {/* Right section — Workspace Selector, Quick Language Toggle, Bell, Avatar */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3.5">
        <GroupSelector
          workspaces={mockWorkspaces}
          activeWorkspace={activeWorkspace}
        />

        {/* Quick Language Toggle Button — Cố định kích thước min-w và h chống giật */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex h-9 min-w-[62px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer whitespace-nowrap select-none"
          title={t("common.switchLanguage")}
          aria-label={t("common.switchLanguage")}
        >
          <Globe size={14} className="text-slate-500 shrink-0" />
          <span className="text-[11px] font-bold tracking-wide">
            {isVietnamese ? "VI" : "EN"}
          </span>
        </button>

        <NotificationBell count={3} />
        <UserAvatar user={mockCurrentUser} />
      </div>
    </header>
  );
}

export default Topbar;
