import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import Topbar from "~/layouts/DefaultLayout/components/Topbar";
import { GroupProvider } from "~/contexts/GroupContext";

function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading page">
      <span className="size-7 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
    </div>
  );
}

function DefaultLayout() {
  const location = useLocation();

  return (
    <GroupProvider>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Topbar />
        <main
          key={location.pathname}
          className="flex-1 animate-in fade-in-0 slide-in-from-left-4 duration-300 ease-out motion-reduce:animate-none"
        >
          {/* Suspense lồng bên trong: đổi trang chỉ thay phần nội dung, Topbar giữ nguyên (không nháy toàn màn hình) */}
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </GroupProvider>
  );
}

export default DefaultLayout;
