import { useLocation } from "react-router";

/**
 * Custom hook nhận diện nhóm (workspace) hiện tại dựa trên route URL.
 * Nếu URL không chứa groupId (e.g. / hoặc /home), hook nhận định đang ở Trang chủ.
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

  // Kiểm tra xem hiện tại URL có khớp /groups/:groupId hay không
  const groupMatch = location.pathname.match(/\/groups\/([^/]+)/);
  const currentGroupId = groupMatch ? groupMatch[1] : null;

  const activeWorkspace = currentGroupId
    ? workspaces.find((ws) => String(ws.id) === String(currentGroupId)) || {
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
