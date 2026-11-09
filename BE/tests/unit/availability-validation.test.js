import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getSlotsValidationError, MAX_SLOTS } from "../../src/validations/availability.validation.js";

const slot = (extra = {}) => ({ dayIndex: 0, dateStr: "2026-11-09", startMinutes: 480, endMinutes: 540, label: "Available", note: "", ...extra });
const rejects = (slots, fragment) => {
  const error = getSlotsValidationError(slots);
  assert.ok(error, `phải báo lỗi cho ${JSON.stringify(slots).slice(0, 80)}`);
  if (fragment) assert.match(error, fragment);
};

describe("getSlotsValidationError — hợp lệ", () => {
  test("mảng rỗng (xoá hết lịch)", () => assert.equal(getSlotsValidationError([]), null));
  test("nhiều slot, nhiều ngày, sát nhau nhưng không chồng", () =>
    assert.equal(getSlotsValidationError([slot(), slot({ startMinutes: 540, endMinutes: 600 }), slot({ dayIndex: 1, dateStr: "2026-11-10" })]), null));
  test("cùng giờ nhưng khác tuần (khác dateStr) không tính là chồng", () =>
    assert.equal(getSlotsValidationError([slot(), slot({ dateStr: "2026-11-16" })]), null));
  test("biên 00:00–24:00, không có label/note", () =>
    assert.equal(getSlotsValidationError([{ dayIndex: 6, dateStr: "2026-11-15", startMinutes: 0, endMinutes: 1440 }]), null));
  test("note đúng 500 ký tự", () => assert.equal(getSlotsValidationError([slot({ note: "x".repeat(500) })]), null));
});

describe("getSlotsValidationError — dữ liệu rác (đều phải 400, không lọt vào DB)", () => {
  test("slots không phải mảng", () => rejects("abc", /mảng/));
  test("vượt giới hạn số slot", () =>
    rejects(Array.from({ length: MAX_SLOTS + 1 }, (_, i) => slot({ dateStr: `2026-${String(1 + (i % 12)).padStart(2, "0")}-01` })), /Tối đa/));
  test("slot null / không phải object", () => { rejects([null], /object/); rejects(["x"], /object/); rejects([[1]], /object/); });
  test("giờ kết thúc trước giờ bắt đầu", () => rejects([slot({ startMinutes: 600, endMinutes: 480 })], /kết thúc/));
  test("giờ bằng nhau", () => rejects([slot({ startMinutes: 480, endMinutes: 480 })], /kết thúc/));
  test("dayIndex ngoài 0–6 hoặc không phải số nguyên", () => { rejects([slot({ dayIndex: 99 })], /dayIndex/); rejects([slot({ dayIndex: "1" })], /dayIndex/); });
  test("ngày không tồn tại / sai định dạng / thiếu", () => {
    rejects([slot({ dateStr: "2026-13-45" })], /dateStr/);
    rejects([slot({ dateStr: "2026-02-30" })], /dateStr/);
    rejects([slot({ dateStr: "09/11/2026" })], /dateStr/);
    rejects([slot({ dateStr: undefined })], /dateStr/);
  });
  test("phút là chữ, âm, quá 24h, lệch lưới 30 phút", () => {
    rejects([slot({ startMinutes: "abc" })], /giờ/);
    rejects([slot({ startMinutes: -60 })], /giờ/);
    rejects([slot({ endMinutes: 2000 })], /giờ/);
    rejects([slot({ startMinutes: 487 })], /giờ/);
  });
  test("note quá 500 ký tự, label quá dài hoặc sai kiểu", () => {
    rejects([slot({ note: "x".repeat(100000) })], /ghi chú/);
    rejects([slot({ label: "x".repeat(51) })], /nhãn/);
    rejects([slot({ note: 123 })], /ghi chú/);
  });
  test("hai slot chồng giờ trong cùng ngày", () =>
    rejects([slot({ startMinutes: 480, endMinutes: 600 }), slot({ startMinutes: 540, endMinutes: 660 })], /#1 và #2 bị chồng/));
  test("slot trùng y hệt", () => rejects([slot(), slot()], /chồng/));
});
