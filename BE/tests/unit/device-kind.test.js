import assert from "node:assert/strict";
import { test } from "node:test";
import { detectDeviceKind, deviceFromRequest } from "../../src/utils/deviceKind.js";

test("detectDeviceKind: điện thoại, máy tính bảng, máy tính với Safari / Chrome / Cốc Cốc", () => {
  const cases = [
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1", "mobile"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36", "mobile"],
    ["Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 coc_coc_browser/120.0 Chrome/120.0 Mobile Safari/537.36", "mobile"],
    ["Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", "tablet"],
    ["Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120.0 Safari/537.36", "tablet"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 coc_coc_browser/120.0", "desktop"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", "desktop"],
  ];
  for (const [ua, kind] of cases) assert.equal(detectDeviceKind(ua), kind, ua);
});

test("detectDeviceKind: không có User-Agent thì là máy tính; header Sec-CH-UA-Mobile ?1 là điện thoại", () => {
  assert.equal(detectDeviceKind(""), "desktop");
  assert.equal(detectDeviceKind(undefined), "desktop");
  assert.equal(detectDeviceKind("Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0", "?1"), "mobile");
});

test("deviceFromRequest: cắt User-Agent còn 300 ký tự", () => {
  const device = deviceFromRequest({ headers: { "user-agent": `iPhone ${"x".repeat(500)}` } });
  assert.equal(device.kind, "mobile");
  assert.equal(device.userAgent.length, 300);
  assert.deepEqual(deviceFromRequest({ headers: {} }), { kind: "desktop", userAgent: "" });
});
