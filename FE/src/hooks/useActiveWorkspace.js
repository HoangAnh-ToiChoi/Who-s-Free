import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router";
import http from "~/utils/http";
import { extractIdFromSlug } from "~/utils/slugify";

// In-memory cache để tra cứu tức thì sessionId -> groupId mà không bị giật/re-fetch
const sessionGroupCache = new Map();

/**
 * Custom hook nhận diện nhóm (workspace) hiện tại dựa trên route URL.
 * Hỗ trợ tự động:
 * 1. /groups/:groupId (Trang chi tiết nhóm)
 * 2. /matrix/:sessionSlug (Trang Ma trận thành viên theo path slug)
 * 3. /lead-matrix/:sessionSlug (Trang Ma trận trưởng nhóm theo path slug)
 *
 * Nếu URL không thuộc bất kỳ nhóm hoặc phiên làm việc nào (ví dụ / hoặc /home),
 * hook nhận định đang ở Trang chủ.
 *
 * @param {Array} workspaces - Danh sách các workspace/nhóm khả dụng
 * @returns {{
 *   activeWorkspace: Object|null,
 *   currentGroupId: string|null,
 *   isHome: boolean
 * }}
 */
export function useActiveWorkspace(workspaces = []) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [matrixGroupId, setMatrixGroupId] = useState(null);

  // 1. Nhận diện Group ID từ route /groups/:groupId
  const groupMatch = location.pathname.match(/\/groups\/([^/]+)/);
  const pathGroupId = groupMatch ? groupMatch[1] : null;

  // 2. Nhận diện Session Slug trực tiếp từ Route Path /matrix/:sessionSlug hoặc /lead-matrix/:sessionSlug
  const matrixMatch = location.pathname.match(/\/(?:lead-)?matrix\/([^/]+)/);
  const pathSessionSlug = matrixMatch ? matrixMatch[1] : null;
  const isMatrixRoute =
    location.pathname.startsWith("/matrix") ||
    location.pathname.startsWith("/lead-matrix");

  const sessionSlug = pathSessionSlug || searchParams.get("session");
  const directGroupId = searchParams.get("groupId") || searchParams.get("group");

  useEffect(() => {
    if (!isMatrixRoute) {
      setMatrixGroupId(null);
      return;
    }

    if (directGroupId) {
      setMatrixGroupId(directGroupId);
      return;
    }

    if (!sessionSlug) return;

    const actualSessionId = extractIdFromSlug(sessionSlug);
    if (!actualSessionId) return;

    // Tra cứu nhanh từ cache nếu đã từng lấy
    if (sessionGroupCache.has(actualSessionId)) {
      setMatrixGroupId(sessionGroupCache.get(actualSessionId));
      return;
    }

    // Truy vấn session từ API để lấy groupId tương ứng
    let isMounted = true;
    http
      .get(`/sessions/${actualSessionId}`)
      .then((session) => {
        if (isMounted && session?.groupId) {
          sessionGroupCache.set(actualSessionId, session.groupId);
          setMatrixGroupId(session.groupId);
        }
      })
      .catch(() => {
        http
          .get(`/sessions?slug=${sessionSlug}`)
          .then((res) => {
            const session = Array.isArray(res) ? res[0] : res;
            if (isMounted && session?.groupId) {
              sessionGroupCache.set(actualSessionId, session.groupId);
              setMatrixGroupId(session.groupId);
            }
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, [isMatrixRoute, sessionSlug, directGroupId]);

  const currentGroupId = pathGroupId || matrixGroupId;

  const activeWorkspace = currentGroupId
    ? workspaces.find(
        (ws) =>
          String(ws.id) === String(currentGroupId) ||
          String(ws.slug) === String(currentGroupId)
      ) || {
        id: currentGroupId,
        name: `Group #${currentGroupId}`,
        role: "Member",
      }
    : null;

  return {
    activeWorkspace,
    currentGroupId,
    isHome: !activeWorkspace,
  };
}

export default useActiveWorkspace;
