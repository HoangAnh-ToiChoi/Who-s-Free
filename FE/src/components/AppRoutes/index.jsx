import { BrowserRouter, Route, Routes, Navigate } from "react-router";

// Layouts
import DefaultLayout from "~/layouts/DefaultLayout";

// Pages
import Home from "~/pages/Home";
import Group from "~/pages/Group";
import MemberMatrix from "~/pages/MemberMatrix";
import LeadMatrix from "~/pages/LeadMatrix";
import Placeholder from "~/pages/Placeholder";

function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<DefaultLayout />}>
          {/* Landing page is Home Dashboard */}
          <Route index element={<Home />} />
          <Route path="/home" element={<Home />} />
          {/* Legacy /groups redirects to / (Home) */}
          <Route path="/groups" element={<Navigate to="/" replace />} />
          {/* Specific Group Workspace */}
          <Route path="/groups/:groupId" element={<Group />} />
          {/* More pages */}
          <Route path="/overview" element={<Placeholder pageName="Overview" />} />
          {/* Matrix pages — Gắn trực tiếp slug lên route */}
          <Route path="/matrix/:sessionSlug" element={<MemberMatrix />} />
          <Route path="/matrix" element={<MemberMatrix />} />
          <Route path="/lead-matrix/:sessionSlug" element={<LeadMatrix />} />
          <Route path="/lead-matrix" element={<LeadMatrix />} />
          <Route path="/settings" element={<Placeholder pageName="Settings" />} />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
