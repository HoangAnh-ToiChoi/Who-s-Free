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
const EMPTY_VI = `Chào mọi người nha! Lịch "Họp tuần" hiện chưa có ai chọn giờ rảnh nên mình chưa chốt được. Mọi người dành ít phút điền giúp mình để tụi mình sớm có lịch họp nha. Điền ở đây nè: ${LINK}`;
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
    `Chào mọi người nha! Mình vừa xem lịch "Họp tuần" rồi, khung giờ nhiều bạn rảnh nhất là Thứ Ba, 08/09 13:30–14:30 (2/3 bạn rảnh). Nếu mọi người thấy ổn thì mình chốt khung này luôn nha, còn ai thấy chưa tiện thì nhắn mình để mình xem lại. Chi tiết ở đây nè: ${LINK}`,
  );
});

test("giờ buổi sáng được đệm số 0 (08:00, không phải 8:00)", () => {
  const members = [{ memberId: "a", slots: [slot("2026-09-09", 480, 540)] }];
  assert.match(build(members), /Thứ Tư, 09\/09 08:00–09:00 \(1\/1 bạn rảnh\)/);
});

test("không có khung giờ chung (mỗi khung chỉ 1 người, nhóm > 1): nói rõ chưa trùng", () => {
  const members = [
    { memberId: "a", slots: [slot("2026-09-08", 480, 540)] },
    { memberId: "b", slots: [slot("2026-09-09", 600, 660)] },
  ];
  const message = build(members);
  assert.match(message, /chưa có khung giờ nào nhiều bạn cùng rảnh/);
  assert.match(message, /\(mới có 1\/2 bạn rảnh\)/);
  assert.ok(message.endsWith(LINK));
});

test("chưa ai chọn lịch: không có khung giờ, không chia cho 0", () => {
  const members = [{ memberId: "a", slots: [] }, { memberId: "b", slots: [] }];
  assert.equal(build(members), EMPTY_VI);
});

test("0 thành viên: không lỗi, ra tin nhắn rỗng khung giờ", () => {
  assert.equal(build([]), EMPTY_VI);
  assert.equal(build(undefined), build([]));
});

test("bản tiếng Anh dùng đúng key en", () => {
  const members = [{ memberId: "a", slots: [slot("2026-09-08", 780, 840)] }, { memberId: "b", slots: [slot("2026-09-08", 780, 840)] }];
  assert.equal(
    build(members, "en"),
    `Hi everyone! I just checked the "Họp tuần" schedule, and great news: all 2 of us are free on Tuesday, 08/09 13:00–14:00. If that works for you, I'll lock it in. Details here: ${LINK}`,
  );
});

test("cả nhóm đều rảnh: dùng câu riêng 'cả N bạn đều rảnh', không nói n/n", () => {
  const members = ["a", "b", "c"].map((memberId) => ({ memberId, slots: [slot("2026-09-08", 780, 840)] }));
  const message = build(members);
  assert.match(message, /vui quá vì cả 3 bạn đều rảnh vào Thứ Ba, 08\/09 13:00–14:00/);
  assert.doesNotMatch(message, /3\/3/);
  assert.ok(message.endsWith(LINK));
});

test("mọi biến thể tin nhắn đều kết thúc bằng link và không còn placeholder chưa thay", () => {
  const one = [{ memberId: "a", slots: [slot("2026-09-08", 780, 840)] }];
  const split = [{ memberId: "a", slots: [slot("2026-09-08", 480, 540)] }, { memberId: "b", slots: [slot("2026-09-09", 600, 660)] }];
  for (const lang of ["vi", "en"]) {
    for (const members of [one, split, [], [{ memberId: "a", slots: [] }]]) {
      const message = build(members, lang);
      assert.ok(message.endsWith(LINK), message);
      assert.doesNotMatch(message, /\{\{|undefined|NaN/);
    }
  }
});
