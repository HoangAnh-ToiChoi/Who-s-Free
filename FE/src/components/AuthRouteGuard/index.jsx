import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useUserGroupRole } from "~/hooks/useUserGroupRole";
import { getSafeReturnUrl } from "~/utils/safeReturnUrl";

function AuthRouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status">
      <span className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
    </div>
  );
}

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthRouteLoading />;
  if (!isAuthenticated) {
    // Giữ lại trang đang muốn vào (vd: link trong email chốt lịch) để đăng nhập/đăng ký xong quay lại đúng đó
    const target = `${location.pathname}${location.search}`;
    const loginPath = target === "/" ? "/auth/login" : `/auth/login?returnUrl=${encodeURIComponent(target)}`;
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}

export function RequireLeadRole() {
  const { groupId } = useParams();
  const { role, isLoading } = useUserGroupRole(groupId);

  if (isLoading) return <AuthRouteLoading />;
  if (role !== "owner" && role !== "lead") return <Navigate to={groupId ? `/groups/${groupId}` : "/"} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthRouteLoading />;
  if (isAuthenticated) {
    return <Navigate to={getSafeReturnUrl(location.search)} replace />;
  }

  return <Outlet />;
}
