import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import { GuestOnly, RequireAuth } from "~/components/AuthRouteGuard";

const DefaultLayout = lazy(() => import("~/layouts/DefaultLayout"));
const AuthLayout = lazy(() => import("~/layouts/AuthLayout"));

const Home = lazy(() => import("~/pages/Home"));
const Group = lazy(() => import("~/pages/Group"));
const MemberMatrix = lazy(() => import("~/pages/MemberMatrix"));
const LeadMatrix = lazy(() => import("~/pages/LeadMatrix"));
const Placeholder = lazy(() => import("~/pages/Placeholder"));
const Login = lazy(() => import("~/pages/Auth/Login"));
const Register = lazy(() => import("~/pages/Auth/Register"));
const ForgotPassword = lazy(() => import("~/pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("~/pages/Auth/ResetPassword"));
const AuthCallback = lazy(() => import("~/pages/Auth/AuthCallback"));
const Invite = lazy(() => import("~/pages/Invite"));
const Join = lazy(() => import("~/pages/Join"));

function RouteLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <span className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* Public Invitation Acceptance Flow */}
          <Route path="/invite/:token" element={<Invite />} />
          {/* Public Group Join Link Flow */}
          <Route path="/join/:token" element={<Join />} />

          {/* Auth Flow Routes — Giao diện Layout riêng biệt */}
          <Route element={<GuestOnly />}>
            <Route element={<AuthLayout />}>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Route>
          </Route>

          {/* Shortcuts tiện lợi */}
          <Route
            path="/login"
            element={<Navigate to="/auth/login" replace />}
          />
          <Route
            path="/register"
            element={<Navigate to="/auth/register" replace />}
          />

          {/* Main Workspace Layout */}
          <Route element={<RequireAuth />}>
            <Route element={<DefaultLayout />}>
              {/* Landing page is Home Dashboard */}
              <Route index element={<Home />} />
              <Route path="/home" element={<Home />} />
              {/* Legacy /groups redirects to / (Home) */}
              <Route path="/groups" element={<Navigate to="/" replace />} />
              {/* Specific Group Workspace */}
              <Route path="/groups/:groupId" element={<Group />} />
              {/* More pages */}
              <Route
                path="/overview"
                element={<Placeholder pageName="Overview" />}
              />
              {/* Matrix pages — Gắn trực tiếp slug lên route */}
              <Route path="/matrix/:sessionSlug" element={<MemberMatrix />} />
              <Route path="/matrix" element={<MemberMatrix />} />
              <Route path="/lead-matrix/:sessionSlug" element={<LeadMatrix />} />
              <Route path="/lead-matrix" element={<LeadMatrix />} />
              <Route
                path="/settings"
                element={<Placeholder pageName="Settings" />}
              />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;
