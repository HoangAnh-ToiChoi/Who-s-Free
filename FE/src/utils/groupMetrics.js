/**
 * groupMetrics.js - Tính toán số liệu thống kê cấp nhóm (Group-level metrics)
 *
 * Tách biệt khỏi matrixCalculations.js vì không liên quan đến overlap matrix của session.
 */

/**
 * Tính activeSessionsCount và turnoutRate từ danh sách session của nhóm.
 *
 * @param {Array} sessions - Danh sách session của nhóm
 * @param {Object} group - Dữ liệu nhóm (fallback responseRate)
 * @returns {{ activeSessionsCount: number, turnoutRate: number }}
 */
export function calculateGroupMetrics(sessions = [], group = null) {
  const activeSessions = (sessions || []).filter(
    (s) => s.status !== "archived" && s.status !== "cancelled"
  );
  const activeSessionsCount = activeSessions.length;

  let turnoutRate = group?.responseRate || 0;
  if (activeSessions.length > 0) {
    const sumQuorum = activeSessions.reduce(
      (acc, s) => acc + (typeof s.quorumPercent === "number" ? s.quorumPercent : 0),
      0
    );
    turnoutRate = Math.round(sumQuorum / activeSessions.length);
  }

  return { activeSessionsCount, turnoutRate };
}
