import { useContext } from "react";
import { GroupContext } from "~/contexts/GroupContext";

/**
 * useGroups - Custom hook để truy cập dữ liệu nhóm dùng chung từ GroupContext.
 * Tuân thủ SRP: Chỉ cung cấp interface kết nối React component tới GroupContext.
 */
export function useGroups() {
  const context = useContext(GroupContext);

  if (!context) {
    throw new Error("useGroups must be used within a GroupProvider");
  }

  return context;
}

export default useGroups;
