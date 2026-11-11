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

// Trang ma trận: khung cao đúng 1 màn hình (Topbar cao bao nhiêu thì lưới lấy phần còn lại).
// Không dùng calc(100dvh - 72px): khi máy phóng to cỡ chữ, Topbar cao hơn 72px → cả trang bị cuộn thêm.
const MATRIX_PATH = /\/(lead-)?matrix(\/|$)/;

function DefaultLayout() {
  const location = useLocation();
  const isMatrix = MATRIX_PATH.test(location.pathname);

  return (
    <GroupProvider>
      <div className={isMatrix ? "flex h-dvh flex-col overflow-hidden bg-slate-50" : "flex min-h-screen flex-col bg-slate-50"}>
        <Topbar />
        <main
          key={location.pathname}
          className={`${isMatrix ? "flex min-h-0 flex-col " : ""}flex-1 animate-in fade-in-0 slide-in-from-left-4 duration-300 ease-out motion-reduce:animate-none`}
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
