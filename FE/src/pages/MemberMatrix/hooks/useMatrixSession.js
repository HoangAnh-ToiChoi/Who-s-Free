import { useSessionResolver } from "~/hooks/useSessionResolver";

/**
 * useMatrixSession - Hook riêng cho trang MemberMatrix
 * Kế thừa useSessionResolver (dùng chung) để resolve session
 */
export function useMatrixSession() {
  const { currentSession } = useSessionResolver();

  return {
    currentSession,
  };
}

export default useMatrixSession;
