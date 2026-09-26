import { BrowserRouter, Route, Routes, Navigate } from "react-router";

// Layouts
import DefaultLayout from "~/layouts/DefaultLayout";

// Pages
import Groups from "~/pages/Groups";
import GroupDetail from "~/pages/GroupDetail";

function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<DefaultLayout />}>
          {/* Redirect root → /groups */}
          <Route index element={<Navigate to="/groups" replace />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          {/* More pages will be added here */}
          <Route path="/overview" element={<div className="p-8 text-zinc-400">Overview — coming soon</div>} />
          <Route path="/matrix" element={<div className="p-8 text-zinc-400">Availability Matrix — coming soon</div>} />
          <Route path="/time-grid" element={<div className="p-8 text-zinc-400">Time Grid — coming soon</div>} />
          <Route path="/settings" element={<div className="p-8 text-zinc-400">Settings — coming soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
