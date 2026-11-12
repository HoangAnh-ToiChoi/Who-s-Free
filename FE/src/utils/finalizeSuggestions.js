// Gợi ý khung giờ trong modal Chốt lịch, tính trên MỌI ngày của phiên (không chỉ tuần đang xem).

const TOP = 3;
const sameIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

/** Gộp các ô 30 phút liền nhau, cùng ngày và cùng nhóm người rảnh thành một khung giờ. */
export function mergeRuns(cells = []) {
  const runs = [];
  for (const cell of cells) {
    const last = runs[runs.length - 1];
    if (last && last.date === cell.date && last.end === cell.start && sameIds(last.memberIds, cell.memberIds)) {
      last.end = cell.end;
    } else {
      runs.push({ date: cell.date, start: cell.start, end: cell.end, count: cell.count, memberIds: cell.memberIds });
    }
  }
  return runs;
}

const byTime = (a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1);
const longer = (a, b) => b.end - b.start - (a.end - a.start);

/**
 * optimal: nhiều người rảnh nhất, cùng số người thì khung dài hơn trước.
 * limited: khung có người rảnh nhưng thiếu người (ít người nhất trước), bỏ những khung đã nằm trong optimal.
 * @param {Array<{ date: string, start: number, end: number, count: number, memberIds: string[] }>} cells
 * @param {number} total - số thành viên đã nhập lịch
 */
export function rankSuggestions(cells, total) {
  const runs = mergeRuns(cells);
  const optimal = [...runs].sort((a, b) => b.count - a.count || longer(a, b) || byTime(a, b)).slice(0, TOP);
  const limited = runs
    .filter((run) => run.count < total && !optimal.includes(run))
    .sort((a, b) => a.count - b.count || longer(a, b) || byTime(a, b))
    .slice(0, TOP);
  return { optimal, limited };
}
