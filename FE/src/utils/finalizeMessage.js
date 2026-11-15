// Tin nhắn chốt lịch để trưởng nhóm dán vào Zalo/Messenger. Dùng lại logic gợi ý của modal Chốt lịch.
import { buildSelectedCells } from "./finalizeCandidates.js";
import { rankSuggestions } from "./finalizeSuggestions.js";

/** Các giọng văn có sẵn, khớp khoá `finalize.copy.<style>` trong locales. */
export const COPY_STYLES = ["cheerful", "casual"];

const pad = (n) => String(n).padStart(2, "0");
const formatClock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** "2026-09-08" -> "Thứ Ba, 08/09" (tên thứ theo ngôn ngữ; tính theo UTC nên không lệch ngày theo múi giờ). */
export function formatSlotDate(dateStr, lang = "vi") {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const weekday = new Intl.DateTimeFormat(lang, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${label}, ${pad(d)}/${pad(m)}`;
}

/**
 * @param {{ title: string, members: Array, link: string, t: Function, lang?: string, style?: "cheerful"|"casual" }} input
 *   members: toàn bộ thành viên của phiên (người chưa nhập lịch có slots rỗng) — total = members.length
 *   style: giọng văn của tin nhắn; giá trị lạ rơi về "cheerful"
 * @returns {string}
 */
export function buildFinalizeMessage({ title, members = [], link, t, lang = "vi", style = "cheerful" }) {
  const tone = COPY_STYLES.includes(style) ? style : "cheerful";
  const total = members.length;
  const { optimal } = rankSuggestions(buildSelectedCells(members), total);
  const best = optimal[0];

  if (!best) return t(`finalize.copy.${tone}.empty`, { title, total, link });

  const slot = `${formatSlotDate(best.date, lang)} ${formatClock(best.start)}–${formatClock(best.end)}`;
  const params = { title, slot, count: best.count, total, link };
  const hasCommonSlot = total <= 1 || best.count >= 2;
  const everyoneFree = total >= 2 && best.count === total;
  const variant = everyoneFree ? "all" : hasCommonSlot ? "some" : "noCommon";
  return t(`finalize.copy.${tone}.${variant}`, params);
}
