import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

import AppLogo from "~/layouts/DefaultLayout/components/Topbar/components/AppLogo";
import GroupSelector from "~/layouts/DefaultLayout/components/Topbar/components/GroupSelector";
import SearchBar from "~/layouts/DefaultLayout/components/Topbar/components/SearchBar";
import NotificationBell from "~/layouts/DefaultLayout/components/Topbar/components/NotificationBell";
import UserAvatar from "~/layouts/DefaultLayout/components/Topbar/components/UserAvatar";

import { useActiveWorkspace, useGroups, useCurrentUser } from "~/hooks";

function Topbar() {
  const { t, i18n } = useTranslation();
  const { groups, isLoading, createGroup, searchQuery, setSearchQuery } = useGroups();
  const { currentUser } = useCurrentUser();

  // Sử dụng custom hook tách biệt để nhận diện active workspace từ route
  const { activeWorkspace } = useActiveWorkspace(groups, isLoading);

  const isVietnamese = i18n.language?.startsWith("vi");

  const toggleLanguage = () => {
    i18n.changeLanguage(isVietnamese ? "en" : "vi");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-10 py-3.5 shadow-xs">
      {/* Left — Logo */}
      <div className="flex items-center shrink-0">
        <AppLogo />
      </div>

      {/* Center — SearchBar (ẩn trên mobile) */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <SearchBar
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Spacer trên mobile để đẩy right section sang phải */}
      <div className="flex-1 md:hidden" />

      {/* Right — Workspace Selector, Language Toggle, Bell, Avatar */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <GroupSelector
          workspaces={groups}
          activeWorkspace={activeWorkspace}
          onCreateGroup={createGroup}
        />

        {/* Language Toggle — ẩn trên mobile */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="hidden sm:flex h-9 min-w-[62px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer whitespace-nowrap select-none"
          title={t("common.switchLanguage")}
          aria-label={t("common.switchLanguage")}
        >
          <Globe size={14} className="text-slate-500 shrink-0" />
          <span className="text-[11px] font-bold tracking-wide">
            {isVietnamese ? "VI" : "EN"}
          </span>
        </button>

        <NotificationBell count={3} />
        <UserAvatar user={currentUser} />
      </div>
    </header>
  );
}

export default Topbar;
