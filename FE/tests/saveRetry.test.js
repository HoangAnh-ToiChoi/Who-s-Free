import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySaveError } from "../src/utils/saveRetry.js";

test("phiên đã chốt → locked (khớp lại theo server, không thử lại)", () => {
  assert.equal(classifySaveError({ status: 409, code: "SESSION_FINALIZED", details: { status: "finalized", slots: [] } }), "locked");
});

test("mất mạng / server ngủ / quá tải / rate limit → retry", () => {
  for (const status of [undefined, 0, 408, 429, 500, 502, 503, 504]) {
    assert.equal(classifySaveError({ status }), "retry", `status ${status}`);
  }
});

test("lỗi dữ liệu hoặc quyền → fatal", () => {
  for (const status of [400, 403, 404]) assert.equal(classifySaveError({ status }), "fatal");
});
