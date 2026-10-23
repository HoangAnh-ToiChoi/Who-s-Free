import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchWithWake, serverWakeStore, waitForBackend } from "../src/utils/serverWake.js";

const HEALTH = "https://api.test/api/health";
const FAST = { slowMs: 10, intervalMs: 5, maxWaitMs: 500, pingTimeoutMs: 100 };
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

const ok = (status = 200) => ({ ok: status < 400, status });

test("phản hồi bình thường: trả ngay, không bật trạng thái chờ", async () => {
  globalThis.fetch = async () => ok(200);
  const res = await fetchWithWake("https://api.test/api/x", {}, { healthUrl: HEALTH, ...FAST });
  assert.equal(res.status, 200);
  assert.equal(serverWakeStore.getSnapshot(), false);
});

test("máy chủ ngủ: đợi dậy rồi gọi lại, cả với POST, và bật/tắt trạng thái chờ", async () => {
  let up = false;
  let calls = 0;
  const states = [];
  serverWakeStore.subscribe(() => states.push(serverWakeStore.getSnapshot()));
  globalThis.fetch = async (url) => {
    if (url === HEALTH) {
      if (!up) throw new TypeError("network");
      return ok(200);
    }
    calls += 1;
    if (!up) throw new TypeError("network");
    return ok(200);
  };
  setTimeout(() => { up = true; }, 40);

  const res = await fetchWithWake("https://api.test/api/login", { method: "POST", body: "{}" }, { healthUrl: HEALTH, ...FAST });
  assert.equal(res.status, 200);
  assert.equal(calls, 2);
  assert.ok(states.includes(true), "đã bật trạng thái chờ");
  assert.equal(serverWakeStore.getSnapshot(), false);
});

test("máy chủ đang sống nhưng POST trả 503: không gọi lại để tránh gửi trùng", async () => {
  let writes = 0;
  globalThis.fetch = async (url) => {
    if (url === HEALTH) return ok(200);
    writes += 1;
    return ok(503);
  };
  const res = await fetchWithWake("https://api.test/api/sessions", { method: "POST", body: "{}" }, { healthUrl: HEALTH, ...FAST });
  assert.equal(res.status, 503);
  assert.equal(writes, 1);
});

test("máy chủ đang sống nhưng GET trả 503: gọi lại 1 lần", async () => {
  let reads = 0;
  globalThis.fetch = async (url) => {
    if (url === HEALTH) return ok(200);
    reads += 1;
    return reads === 1 ? ok(503) : ok(200);
  };
  const res = await fetchWithWake("https://api.test/api/x", {}, { healthUrl: HEALTH, ...FAST });
  assert.equal(res.status, 200);
  assert.equal(reads, 2);
});

test("waitForBackend: trả true khi dậy, false khi hết thời gian", async () => {
  let n = 0;
  globalThis.fetch = async () => (++n < 3 ? Promise.reject(new TypeError("down")) : ok(200));
  assert.equal(await waitForBackend(HEALTH, FAST), true);

  globalThis.fetch = async () => Promise.reject(new TypeError("down"));
  assert.equal(await waitForBackend(HEALTH, { ...FAST, maxWaitMs: 30 }), false);
});
