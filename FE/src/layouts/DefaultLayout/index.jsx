import { Outlet, useLocation } from "react-router";
import Topbar from "~/layouts/DefaultLayout/components/Topbar";

function DefaultLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main
        key={location.pathname}
        className="flex-1 animate-in fade-in-0 duration-150 ease-out"
      >
        <Outlet />
      </main>
    </div>
  );
}

export default DefaultLayout;
