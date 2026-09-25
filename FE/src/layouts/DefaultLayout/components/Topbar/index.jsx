import { useState } from "react";

import AppLogo from "./components/AppLogo";
import GroupSelector from "./components/GroupSelector";
import SearchBar from "./components/SearchBar";
import NotificationBell from "./components/NotificationBell";
import UserAvatar from "./components/UserAvatar";

import { mockWorkspaces, mockCurrentUser } from "~/data/mockData";

function Topbar() {
  const [activeWorkspace, setActiveWorkspace] = useState(mockWorkspaces[0]);

  return (
    <header className="sticky top-0 z-40 flex items-center border-b border-slate-200 bg-white px-8 sm:px-12 lg:px-16 py-4 shadow-xs">
      {/* Left section — Logo */}
      <div className="flex items-center shrink-0">
        <AppLogo />
      </div>

      {/* Center — SearchBar */}
      <div className="flex flex-1 items-center justify-center">
        <SearchBar />
      </div>

      {/* Right section — Workspace Selector, Bell, Avatar */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <GroupSelector
          workspaces={mockWorkspaces}
          activeWorkspace={activeWorkspace}
          onChange={setActiveWorkspace}
        />
        <NotificationBell count={3} />
        <UserAvatar user={mockCurrentUser} />
      </div>
    </header>
  );
}

export default Topbar;
