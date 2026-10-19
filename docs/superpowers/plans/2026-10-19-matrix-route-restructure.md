# Matrix Route Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix navigation on matrix pages by embedding `groupId` in the URL so the back button, GroupSelector, and session loading all work correctly without extra API calls.

**Architecture:** Change routes from `/matrix/:sessionSlug` to `/groups/:groupId/matrix/:sessionSlug` (same for lead-matrix). This makes `groupId` available in URL params everywhere — `useActiveWorkspace` regex auto-matches `/groups/...` sub-routes so GroupSelector shows the correct group, `useSessionResolver` loads sessions group-scoped, and both headers read `groupId` via `useParams()` instead of fragile session-field lookups.

**Tech Stack:** React + React Router v7, Vite, TailwindCSS

---

## File Map

| File | Change |
|---|---|
| `FE/src/components/AppRoutes/index.jsx` | Replace old matrix routes with group-nested routes |
| `FE/src/pages/Group/subpages/GroupSessions/components/SessionCard/index.jsx` | Build matrixUrl with groupId from useParams |
| `FE/src/hooks/useSessionResolver.js` | Read groupId from params, pass to getGroupCalendars |
| `FE/src/pages/MemberMatrix/components/MatrixHeader/index.jsx` | Simplify: useParams groupId instead of session field logic |
| `FE/src/pages/LeadMatrix/components/LeadMatrixHeader/index.jsx` | Same simplification as MatrixHeader |
| `FE/src/hooks/useActiveWorkspace.js` | Remove dead matrix session-fetch code (auto-works via /groups/ regex) |

---

### Task 1: Update AppRoutes — route definitions

**Files:**
- Modify: `FE/src/components/AppRoutes/index.jsx`

- [ ] **Step 1: Replace old matrix routes**

In `FE/src/components/AppRoutes/index.jsx`, find and replace the four matrix route lines (currently around lines 80-83):

Replace:
```jsx
<Route path="/matrix/:sessionSlug" element={<MemberMatrix />} />
<Route path="/matrix" element={<MemberMatrix />} />
<Route path="/lead-matrix/:sessionSlug" element={<LeadMatrix />} />
<Route path="/lead-matrix" element={<LeadMatrix />} />
```

With:
```jsx
<Route path="/groups/:groupId/matrix/:sessionSlug" element={<MemberMatrix />} />
<Route path="/groups/:groupId/matrix" element={<MemberMatrix />} />
<Route path="/groups/:groupId/lead-matrix/:sessionSlug" element={<LeadMatrix />} />
<Route path="/groups/:groupId/lead-matrix" element={<LeadMatrix />} />
```

**Note:** The existing `/groups/:groupId` route stays as-is. The new matrix routes are additional siblings under the same `DefaultLayout`.

- [ ] **Step 2: Verify no compile error**

```bash
cd FE && npm run build 2>&1 | tail -10
```

Expected: Build succeeds. (If it fails on navigate calls in other components — those are fixed in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add FE/src/components/AppRoutes/index.jsx
git commit -m "feat(routes): nest matrix/lead-matrix under /groups/:groupId"
```

---

### Task 2: Update SessionCard — build matrixUrl with groupId

**Files:**
- Modify: `FE/src/pages/Group/subpages/GroupSessions/components/SessionCard/index.jsx`

- [ ] **Step 1: Add useParams and fix matrixUrl**

Add `useParams` to the import and read `groupId` from the current `/groups/:groupId` route:

```jsx
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  MoreHorizontal,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { calcPercentage } from "~/utils";
import { createCompositeSlug } from "~/utils/slugify";

// ... getSessionTheme stays unchanged ...

function SessionCard({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { groupId } = useParams();
  const theme = getSessionTheme(session.tagColor);
  const HighlightIcon = theme.highlightIcon;

  const quorumPercent =
    session.quorumPercent !== undefined
      ? session.quorumPercent
      : calcPercentage(session.respondedCount, session.totalMembers);

  const sessionSlug = session.id
    ? createCompositeSlug(session.title, session.id)
    : (session.slug || session.id);
  const matrixUrl = `/groups/${groupId}/matrix/${sessionSlug}`;

  // JSX stays exactly the same — only matrixUrl changed
  return ( /* ... unchanged ... */ );
}
```

`groupId` is available because `SessionCard` renders inside the `/groups/:groupId` route tree.

- [ ] **Step 2: Manual test**

1. Login → navigate to a group page (`/groups/<groupId>`)
2. Click any session card
3. Verify URL changes to `/groups/<groupId>/matrix/<sessionSlug>`

- [ ] **Step 3: Commit**

```bash
git add FE/src/pages/Group/subpages/GroupSessions/components/SessionCard/index.jsx
git commit -m "feat(session-card): navigate to /groups/:groupId/matrix/:sessionSlug"
```

---

### Task 3: Update useSessionResolver — group-scoped session loading

**Files:**
- Modify: `FE/src/hooks/useSessionResolver.js`

- [ ] **Step 1: Rewrite the hook**

Replace the entire file with:

```js
import { useState, useEffect } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router";
import { calendarService } from "~/service/calendarService/calendarService";
import { createCompositeSlug, extractIdFromSlug } from "~/utils/slugify";

/**
 * useSessionResolver - Hook giải mã và đồng bộ phiên khảo sát (Session)
 * Đọc cả groupId và sessionSlug từ route params.
 * groupId dùng để load đúng sessions của nhóm (group-scoped).
 *
 * @returns {{ currentSession: Object|null, sessions: Array }}
 */
export function useSessionResolver() {
  const { sessionSlug, groupId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSlug = sessionSlug || searchParams.get("session");

  const passedSession = location.state?.session || null;
  const [sessions, setSessions] = useState(passedSession ? [passedSession] : []);
  const [currentSession, setCurrentSession] = useState(passedSession);

  // Load sessions — group-scoped khi có groupId
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      try {
        const data = await calendarService.getGroupCalendars(groupId || null);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setSessions(data);
        }
      } catch (err) {
        console.warn("Failed to load sessions in resolver:", err);
      }
    }
    loadSessions();
    return () => { isMounted = false; };
  }, [groupId]);

  // Đồng bộ currentSession theo slug trên URL
  useEffect(() => {
    if (!sessions.length) return;

    if (activeSlug) {
      const actualId = extractIdFromSlug(activeSlug);
      const foundSession = sessions.find(
        (s) => s.id === actualId || s.id === activeSlug || s.slug === activeSlug
      );

      if (foundSession) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentSession(foundSession);
      } else {
        calendarService
          .getCalendarById(actualId || activeSlug)
          .then((direct) => {
            if (direct) {
              setCurrentSession(direct);
              setSessions((prev) => [...prev, direct]);
            } else {
              setCurrentSession(sessions[0]);
            }
          })
          .catch(() => {
            setCurrentSession(sessions[0]);
          });
      }
    } else {
      // Bare route /groups/:groupId/matrix → redirect tới session đầu tiên
      const first = sessions[0];
      if (first) {
        const canonicalSlug = createCompositeSlug(first.title, first.id);
        const basePath = location.pathname.includes("/lead-matrix")
          ? `/groups/${groupId}/lead-matrix`
          : `/groups/${groupId}/matrix`;
        navigate(`${basePath}/${canonicalSlug}`, {
          replace: true,
          state: { session: first },
        });
        setCurrentSession(first);
      }
    }
  }, [activeSlug, sessions, location.pathname, navigate, groupId]);

  return {
    currentSession,
    sessions,
  };
}

export default useSessionResolver;
```

- [ ] **Step 2: Manual test**

1. Navigate to `/groups/<groupId>/matrix/<sessionSlug>` — verify session loads correctly
2. F5 reload — verify session still loads (no redirect to home)
3. Navigate to `/groups/<groupId>/matrix` (no slug) — verify it auto-redirects to first session

- [ ] **Step 3: Commit**

```bash
git add FE/src/hooks/useSessionResolver.js
git commit -m "refactor(session-resolver): read groupId from params, load group-scoped sessions"
```

---

### Task 4: Simplify MatrixHeader — useParams for groupId

**Files:**
- Modify: `FE/src/pages/MemberMatrix/components/MatrixHeader/index.jsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file with:

```jsx
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";
import { useCurrentUser } from "~/hooks";

/**
 * MatrixHeader - Thanh tiêu đề trên cùng của trang Ma trận thành viên
 * - Link quay lại nhóm (dùng groupId từ URL params — luôn chính xác)
 * - Tên phiên khảo sát
 * - Nút chuyển sang Chế độ Lead (chỉ hiển thị nếu có role Lead)
 */
function MatrixHeader({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { currentUser } = useCurrentUser();

  const userRole = (currentUser?.role || "").toLowerCase();
  const isLead =
    userRole.includes("lead") ||
    userRole.includes("admin") ||
    userRole === "owner" ||
    currentUser?.groupRole === "leadership";

  const backUrl = groupId ? `/groups/${groupId}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-2.5 flex min-h-[36px] shrink-0 items-center justify-between gap-3 select-none">
      <div className="flex min-w-0 items-center gap-2.5 text-xs">
        <Link
          to={backUrl}
          className="group flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 transition-colors hover:text-red-600"
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-0.5 group-hover:text-red-600"
          />
          <span className="hidden sm:inline">
            {t("groupDetail.backToGroup")}
          </span>
        </Link>
        <span className="shrink-0 text-slate-300">/</span>
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate font-bold text-slate-900">
            {session?.title || ""}
          </span>
        </div>
      </div>

      {isLead && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            navigate(`/groups/${groupId}/lead-matrix/${sessionSlug}`, { state: { session } })
          }
          className="h-8 cursor-pointer gap-1.5 rounded-xl border-indigo-200/90 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
        >
          <Shield size={14} className="text-indigo-600" />
          <span>{t("matrix.switchToLeadMode")}</span>
        </Button>
      )}
    </div>
  );
}

export default MatrixHeader;
```

- [ ] **Step 2: Manual test**

1. Navigate to `/groups/<groupId>/matrix/<sessionSlug>`
2. Verify `← Quay lại nhóm` navigates to `/groups/<groupId>` (group page, not home)
3. If Lead role: verify "Switch to Lead Mode" navigates to `/groups/<groupId>/lead-matrix/<sessionSlug>`
4. Verify GroupSelector in Topbar shows correct group name (not "Home")

- [ ] **Step 3: Commit**

```bash
git add FE/src/pages/MemberMatrix/components/MatrixHeader/index.jsx
git commit -m "refactor(matrix-header): use groupId from useParams, remove complex groupTarget logic"
```

---

### Task 5: Simplify LeadMatrixHeader — useParams for groupId

**Files:**
- Modify: `FE/src/pages/LeadMatrix/components/LeadMatrixHeader/index.jsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file with:

```jsx
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createCompositeSlug } from "~/utils/slugify";

/**
 * LeadMatrixHeader - Header trang LeadMatrix cho Trưởng nhóm
 * - Link quay lại nhóm (dùng groupId từ URL params — luôn chính xác)
 * - Tên session + badge "Leader View"
 * - Nút chuyển sang MemberMatrix (Nhập lịch của tôi)
 */
function LeadMatrixHeader({ session }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const backUrl = groupId ? `/groups/${groupId}` : "/";
  const sessionSlug = session?.id
    ? createCompositeSlug(session.title, session.id)
    : session?.slug || session?.id || "";

  return (
    <div className="mb-2.5 flex min-h-[36px] shrink-0 items-center justify-between gap-3 select-none">
      <div className="flex min-w-0 items-center gap-2.5 text-xs">
        <Link
          to={backUrl}
          className="group flex shrink-0 items-center gap-1.5 font-semibold text-slate-500 transition-colors hover:text-red-600"
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-0.5 group-hover:text-red-600"
          />
          <span className="hidden sm:inline">
            {t("groupDetail.backToGroup")}
          </span>
        </Link>
        <span className="shrink-0 text-slate-300">/</span>
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="truncate font-bold text-slate-900">
            {session?.title || ""}
          </span>
          <span className="ml-1 shrink-0 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
            {t("leadMatrix.leaderView")}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          navigate(`/groups/${groupId}/matrix/${sessionSlug}`, { state: { session } })
        }
        className="h-8 cursor-pointer gap-1.5 rounded-xl border-indigo-200/90 bg-white px-3 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98]"
      >
        <Calendar size={14} className="text-indigo-600" />
        <span>{t("leadMatrix.enterMySchedule")}</span>
      </Button>
    </div>
  );
}

export default LeadMatrixHeader;
```

- [ ] **Step 2: Manual test**

1. Navigate to `/groups/<groupId>/lead-matrix/<sessionSlug>`
2. Verify `← Quay lại nhóm` navigates to `/groups/<groupId>`
3. Verify "Nhập lịch của tôi" navigates to `/groups/<groupId>/matrix/<sessionSlug>`
4. Verify GroupSelector in Topbar shows correct group name

- [ ] **Step 3: Commit**

```bash
git add FE/src/pages/LeadMatrix/components/LeadMatrixHeader/index.jsx
git commit -m "refactor(lead-matrix-header): use groupId from useParams, remove complex groupTarget logic"
```

---

### Task 6: Simplify useActiveWorkspace — remove dead matrix fetch code

**Files:**
- Modify: `FE/src/hooks/useActiveWorkspace.js`

**Context:** The async session→groupId fetch was needed when matrix routes were `/matrix/:sessionSlug` (no groupId in URL). Now that routes are `/groups/:groupId/matrix/...`, the existing regex `\/groups\/([^/]+)` auto-matches and extracts `groupId` from the URL. The entire `isMatrixRoute` / `matrixGroupId` / `sessionGroupCache` / `useEffect` is dead code.

- [ ] **Step 1: Rewrite the hook**

Replace the entire file with:

```js
import { useLocation } from "react-router";

const CACHE_KEY = "whosfree_active_group_cache";

function getCachedGroup(identifier) {
  if (!identifier || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${identifier}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage errors
  }
  return null;
}

function setCachedGroup(group) {
  if (!group || (!group.id && !group.slug) || typeof window === "undefined") return;
  try {
    const data = JSON.stringify({
      id: group.id,
      name: group.name,
      slug: group.slug,
      role: group.role,
    });
    if (group.id) sessionStorage.setItem(`${CACHE_KEY}_${group.id}`, data);
    if (group.slug) sessionStorage.setItem(`${CACHE_KEY}_${group.slug}`, data);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Custom hook nhận diện nhóm (workspace) hiện tại dựa trên route URL.
 * Hỗ trợ mọi route bắt đầu với /groups/:groupId — bao gồm sub-routes như
 * /groups/:groupId/matrix/... và /groups/:groupId/lead-matrix/...
 *
 * @param {Array} workspaces - Danh sách các workspace/nhóm khả dụng
 * @param {boolean} isLoading - Trạng thái đang tải dữ liệu danh sách nhóm từ API
 * @returns {{ activeWorkspace: Object|null, currentGroupId: string|null, isHome: boolean }}
 */
export function useActiveWorkspace(workspaces = [], isLoading = false) {
  const location = useLocation();

  // Khớp bất kỳ route nào dạng /groups/:groupId (kể cả /groups/:groupId/matrix/...)
  const groupMatch = location.pathname.match(/\/groups\/([^/]+)/);
  const currentGroupId = groupMatch ? groupMatch[1] : null;

  let activeWorkspace = null;

  if (currentGroupId) {
    const found = workspaces.find(
      (ws) =>
        String(ws.id) === String(currentGroupId) ||
        String(ws.slug) === String(currentGroupId)
    );

    if (found) {
      setCachedGroup(found);
      activeWorkspace = found;
    } else {
      const cached = getCachedGroup(currentGroupId);
      if (cached) {
        activeWorkspace = cached;
      } else if (isLoading || workspaces.length === 0) {
        activeWorkspace = {
          id: currentGroupId,
          name: "",
          role: "Member",
          isLoading: true,
        };
      } else {
        activeWorkspace = null;
      }
    }
  }

  return {
    activeWorkspace,
    currentGroupId,
    isHome: !currentGroupId && !activeWorkspace,
  };
}

export default useActiveWorkspace;
```

- [ ] **Step 2: Manual test**

1. Navigate to `/groups/<groupId>/matrix/<sessionSlug>`
2. Verify GroupSelector shows correct group name immediately (no flicker, no async delay)
3. Open DevTools Network tab — verify NO extra `GET /sessions/<id>` call fires from `useActiveWorkspace`
4. F5 reload on matrix page — GroupSelector shows group name from sessionStorage cache while groups list loads

- [ ] **Step 3: Commit**

```bash
git add FE/src/hooks/useActiveWorkspace.js
git commit -m "refactor(active-workspace): remove dead matrix session-fetch, /groups/ regex handles all routes"
```
