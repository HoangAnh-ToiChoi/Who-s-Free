import { BrowserRouter, Route, Routes, Navigate } from "react-router";

// Layouts
import DefaultLayout from "~/layouts/DefaultLayout";

// Pages
import Home from "~/pages/Home";
import Group from "~/pages/Group";

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
