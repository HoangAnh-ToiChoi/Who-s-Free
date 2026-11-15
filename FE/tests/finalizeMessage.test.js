import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildFinalizeMessage, formatSlotDate } from "../src/utils/finalizeMessage.js";

const locales = {
  vi: JSON.parse(readFileSync(new URL("../src/locales/vi/translation.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../src/locales/en/translation.json", import.meta.url), "utf8")),
};
const makeT = (lang) => (key, params = {}) => {
  const template = key.split(".").reduce((node, part) => node?.[part], locales[lang]);
  assert.equal(typeof template, "string", `thiếu key ${key} (${lang})`);
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name]));
};

const LINK = "https://who-s-free.app/groups/g1/lead-matrix/lich-hop-abc";
const slot = (dateStr, startMinutes, endMinutes) => ({ dateStr, startMinutes, endMinutes });
const build = (members, lang = "vi") => buildFinalizeMessage({ title: "Họp tuần", members, link: LINK, t: makeT(lang), lang });

test("formatSlotDate: thứ + dd/mm có đệm số 0, không lệch ngày", () => {
  assert.equal(formatSlotDate("2026-09-08", "vi"), "Thứ Ba, 08/09");
  assert.match(formatSlotDate("2026-11-15", "vi"), /^Chủ [Nn]hật, 15\/11$/);
  assert.equal(formatSlotDate("2026-09-08", "en"), "Tuesday, 08/09");
});

test("có khung giờ chung: chọn khung nhiều người nhất, HH:mm–HH:mm, n/tổng thành viên", () => {
  const members = [
    { memberId: "a", slots: [slot("2026-09-08", 780, 900)] },
    { memberId: "b", slots: [slot("2026-09-08", 810, 870)] },
    { memberId: "c", slots: [] },
  ];
  assert.equal(
    build(members),
    `Lịch "Họp tuần": khung giờ nhiều người rảnh nhất là Thứ Ba, 08/09 13:30–14:30 (2/3 người rảnh). Chốt tại: ${LINK}`,
  );
});

test("giờ buổi sáng được đệm số 0 (08:00, không phải 8:00)", () => {
  const members = [{ memberId: "a", slots: [slot("2026-09-09", 480, 540)] }];
  assert.match(build(members), /Thứ Tư, 09\/09 08:00–09:00 \(1\/1 người rảnh\)/);
});

test("không có khung giờ chung (mỗi khung chỉ 1 người, nhóm > 1): nói rõ chưa trùng", () => {
  const members = [
    { memberId: "a", slots: [slot("2026-09-08", 480, 540)] },
    { memberId: "b", slots: [slot("2026-09-09", 600, 660)] },
  ];
  const message = build(members);
  assert.match(message, /chưa có khung giờ nào trùng nhau/);
  assert.match(message, /\(1\/2 người rảnh\)/);
  assert.ok(message.endsWith(LINK));
});

test("chưa ai chọn lịch: không có khung giờ, không chia cho 0", () => {
  const members = [{ memberId: "a", slots: [] }, { memberId: "b", slots: [] }];
  assert.equal(build(members), `Lịch "Họp tuần": chưa có khung giờ nào được chọn (0/2 người đã điền). Xem tại: ${LINK}`);
});

test("0 thành viên: không lỗi, ra tin nhắn rỗng khung giờ", () => {
  assert.equal(build([]), `Lịch "Họp tuần": chưa có khung giờ nào được chọn (0/0 người đã điền). Xem tại: ${LINK}`);
  assert.equal(build(undefined), build([]));
});

test("bản tiếng Anh dùng đúng key en", () => {
  const members = [{ memberId: "a", slots: [slot("2026-09-08", 780, 840)] }, { memberId: "b", slots: [slot("2026-09-08", 780, 840)] }];
  assert.equal(
    build(members, "en"),
    `Schedule "Họp tuần": the time most people are free is Tuesday, 08/09 13:00–14:00 (2/2 free). Finalize at: ${LINK}`,
  );
});
