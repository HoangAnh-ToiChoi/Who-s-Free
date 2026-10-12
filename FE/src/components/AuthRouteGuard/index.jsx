import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "~/hooks/useAuth";
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

  if (isLoading) return <AuthRouteLoading />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

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
