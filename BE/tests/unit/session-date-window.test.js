import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getDateWindowError, MAX_WINDOW_DAYS } from "../../src/validations/session.validation.js";

const today = new Date("2026-11-10T03:00:00Z");
const ok = (window) => assert.equal(getDateWindowError(window, today), null);
const bad = (window, fragment) => assert.match(getDateWindowError(window, today) ?? "", fragment);

describe("getDateWindowError", () => {
  test("không gửi ngày (client cũ) vẫn hợp lệ", () => ok({}));
  test("một ngày duy nhất, hôm nay", () => ok({ startDate: "2026-11-10", endDate: "2026-11-10" }));
  test("hôm qua theo UTC vẫn nhận (người dùng UTC+7 đã sang ngày mới)", () => ok({ startDate: "2026-11-09", endDate: "2026-11-12" }));
  test("vắt qua tháng và năm", () => ok({ startDate: "2026-12-28", endDate: "2027-01-05" }));
  test(`đúng ${MAX_WINDOW_DAYS} ngày`, () => ok({ startDate: "2026-11-10", endDate: "2027-02-07" }));

  test("thiếu một trong hai ngày", () => { bad({ startDate: "2026-11-10" }, /hợp lệ/); bad({ endDate: "2026-11-10" }, /hợp lệ/); });
  test("ngày không tồn tại / sai định dạng", () => {
    bad({ startDate: "2026-02-30", endDate: "2026-03-02" }, /hợp lệ/);
    bad({ startDate: "10/11/2026", endDate: "2026-11-12" }, /hợp lệ/);
    bad({ startDate: 20261110, endDate: "2026-11-12" }, /hợp lệ/);
  });
  test("kết thúc trước bắt đầu", () => bad({ startDate: "2026-11-15", endDate: "2026-11-12" }, /kết thúc/));
  test("bắt đầu trong quá khứ", () => bad({ startDate: "2026-11-01", endDate: "2026-11-12" }, /quá khứ/));
  test("quá dài", () => bad({ startDate: "2026-11-10", endDate: "2027-02-08" }, /tối đa/));
});
