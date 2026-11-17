import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { COPY_STYLES, buildFinalizeMessage, formatSlotDate } from "../src/utils/finalizeMessage.js";

const locales = {
  vi: JSON.parse(readFileSync(new URL("../src/locales/vi/translation.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../src/locales/en/translation.json", import.meta.url), "utf8")),
};
const makeT = (lang) => (key, params = {}) => {
  const template = key.split(".").reduce((node, part) => node?.[part], locales[lang]);
  assert.equal(typeof template, "string", `thiếu key ${key} (${lang})`);
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name]));
};

const LINK = "https://who-s-free.app/groups/g1/matrix/lich-hop-abc";
const slot = (dateStr, startMinutes, endMinutes) => ({ dateStr, startMinutes, endMinutes });
const build = (members, lang = "vi", style) =>
  buildFinalizeMessage({ title: "Họp tuần", members, link: LINK, t: makeT(lang), lang, style });

const someFree = [
  { memberId: "a", slots: [slot("2026-09-08", 780, 900)] },
  { memberId: "b", slots: [slot("2026-09-08", 810, 870)] },
  { memberId: "c", slots: [] },
];
const allFree = ["a", "b", "c"].map((memberId) => ({ memberId, slots: [slot("2026-09-08", 780, 840)] }));
const noOverlap = [
  { memberId: "a", slots: [slot("2026-09-08", 480, 540)] },
  { memberId: "b", slots: [slot("2026-09-09", 600, 660)] },
];
const nobody = [{ memberId: "a", slots: [] }, { memberId: "b", slots: [] }];

test("formatSlotDate: thứ + dd/mm có đệm số 0, không lệch ngày", () => {
  assert.equal(formatSlotDate("2026-09-08", "vi"), "Thứ Ba, 08/09");
  assert.match(formatSlotDate("2026-11-15", "vi"), /^Chủ [Nn]hật, 15\/11$/);
  assert.equal(formatSlotDate("2026-09-08", "en"), "Tuesday, 08/09");
});

test("vui vẻ, có khung giờ chung: chọn khung nhiều người nhất, HH:mm–HH:mm, n/tổng", () => {
  assert.equal(
    build(someFree, "vi", "cheerful"),
    `Mọi người ơi, lịch "Họp tuần" có kết quả rồi nè! Khung giờ nhiều bạn rảnh nhất là Thứ Ba, 08/09 13:30–14:30 (2/3 bạn rảnh). Mọi người thấy ổn thì mình chốt khung này luôn nha, ai chưa tiện thì nhắn mình liền. Xem chi tiết ở đây nè: ${LINK}`,
  );
});

test("kiểu thẳng, có khung giờ chung: nói chuyện kiểu bạn bè, ngắn gọn", () => {
  assert.equal(
    build(someFree, "vi", "casual"),
    `ok t coi lịch "Họp tuần" rồi. nhiều người rảnh nhất là Thứ Ba, 08/09 13:30–14:30 (2/3 người). ai ko tiện thì nói luôn, ko thì t chốt khung này. xem chính xác ở đây: ${LINK}`,
  );
});

test("không truyền style: mặc định là vui vẻ; style lạ cũng rơi về vui vẻ", () => {
  const expected = build(someFree, "vi", "cheerful");
  assert.equal(build(someFree, "vi"), expected);
  assert.equal(build(someFree, "vi", "khong-co-kieu-nay"), expected);
});

test("giờ buổi sáng được đệm số 0 (08:00, không phải 8:00)", () => {
  const members = [{ memberId: "a", slots: [slot("2026-09-09", 480, 540)] }];
  for (const style of COPY_STYLES) {
    assert.match(build(members, "vi", style), /Thứ Tư, 09\/09 08:00–09:00/);
  }
});

test("cả nhóm đều rảnh: câu riêng, nói 'cả N', không nói n/n", () => {
  assert.match(build(allFree, "vi", "cheerful"), /Cả 3 bạn đều rảnh vào Thứ Ba, 08\/09 13:00–14:00/);
  assert.match(build(allFree, "vi", "casual"), /cả 3 người đều rảnh Thứ Ba, 08\/09 13:00–14:00/);
  for (const style of COPY_STYLES) assert.doesNotMatch(build(allFree, "vi", style), /3\/3/);
});

test("không có khung giờ chung (mỗi khung chỉ 1 người, nhóm > 1): nói rõ chưa trùng", () => {
  const cheerful = build(noOverlap, "vi", "cheerful");
  assert.match(cheerful, /chưa có khung giờ nào nhiều bạn cùng rảnh/);
  assert.match(cheerful, /\(mới 1\/2 bạn rảnh\)/);
  const casual = build(noOverlap, "vi", "casual");
  assert.match(casual, /chưa có giờ nào nhiều người rảnh chung/);
  assert.match(casual, /\(mới 1\/2 người\)/);
});

test("chưa ai chọn lịch hoặc 0 thành viên: không có khung giờ, không chia cho 0", () => {
  for (const style of COPY_STYLES) {
    assert.match(build(nobody, "vi", style), /chưa (có ai chọn|thấy ai điền) giờ rảnh/);
    assert.equal(build([], "vi", style), build(nobody, "vi", style));
    assert.equal(build(undefined, "vi", style), build([], "vi", style));
  }
});

test("không kể cảm xúc bằng tính từ ('vui quá', 'mừng quá'...): giọng nằm ở cách nói", () => {
  const cases = [someFree, allFree, noOverlap, nobody];
  for (const lang of ["vi", "en"]) {
    for (const style of COPY_STYLES) {
      for (const members of cases) {
        assert.doesNotMatch(build(members, lang, style), /vui quá|mừng quá|so happy|so glad|thrilled/i);
      }
    }
  }
});

test("mọi biến thể (2 giọng × 4 tình huống × vi/en) kết thúc bằng link, không sót placeholder", () => {
  for (const lang of ["vi", "en"]) {
    for (const style of COPY_STYLES) {
      for (const members of [someFree, allFree, noOverlap, nobody, []]) {
        const message = build(members, lang, style);
        assert.ok(message.endsWith(LINK), message);
        assert.doesNotMatch(message, /\{\{|undefined|NaN/);
      }
    }
  }
});

test("bản tiếng Anh dùng đúng key en cho cả hai giọng", () => {
  assert.equal(
    build(allFree, "en", "cheerful"),
    `Hey everyone, the "Họp tuần" schedule has results! All 3 of us are free on Tuesday, 08/09 13:00–14:00, so I'll lock it in. If you have a different idea, just tell me. Details here: ${LINK}`,
  );
  assert.equal(
    build(allFree, "en", "casual"),
    `ok i checked "Họp tuần", all 3 of us are free Tuesday, 08/09 13:00–14:00. locking that in, say so if you disagree. exact details here: ${LINK}`,
  );
});

test("locale vi và en có cùng bộ khoá giọng văn, và mỗi giọng có nhãn + gợi ý cho menu", () => {
  const shape = (lang) => Object.fromEntries(COPY_STYLES.map((style) => [style, Object.keys(locales[lang].finalize.copy[style]).sort()]));
  assert.deepEqual(shape("vi"), shape("en"));
  for (const lang of ["vi", "en"]) {
    for (const style of COPY_STYLES) {
      const { label, hint } = locales[lang].finalize.copyStyle[style];
      assert.ok(label && hint, `thiếu nhãn/gợi ý ${style} (${lang})`);
    }
  }
});
