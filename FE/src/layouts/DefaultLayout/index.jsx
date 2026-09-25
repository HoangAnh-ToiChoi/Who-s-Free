import { Outlet } from "react-router";
import Topbar from "./components/Topbar";

function DefaultLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Topbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default DefaultLayout;
