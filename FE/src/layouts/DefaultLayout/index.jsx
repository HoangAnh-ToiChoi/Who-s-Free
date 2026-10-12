import { Outlet, useLocation } from "react-router";
import Topbar from "~/layouts/DefaultLayout/components/Topbar";
import { GroupProvider } from "~/contexts/GroupContext";

function DefaultLayout() {
  const location = useLocation();

  return (
    <GroupProvider>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Topbar />
        <main
          key={location.pathname}
          className="flex-1 animate-in fade-in-0 duration-150 ease-out"
        >
          <Outlet />
        </main>
      </div>
    </GroupProvider>
  );
}

export default DefaultLayout;
