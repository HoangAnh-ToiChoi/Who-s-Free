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
 * Hoạt động với mọi route có prefix /groups/:groupId —
 * bao gồm /groups/:groupId/matrix/... và /groups/:groupId/lead-matrix/...
 *
 * @param {Array} workspaces - Danh sách các workspace/nhóm khả dụng
 * @param {boolean} isLoading - Trạng thái đang tải dữ liệu danh sách nhóm từ API
 */
export function useActiveWorkspace(workspaces = [], isLoading = false) {
  const location = useLocation();

  // Nhận diện groupId từ bất kỳ route nào có prefix /groups/:groupId
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
