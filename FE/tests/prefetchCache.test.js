import assert from "node:assert/strict";
import { test } from "node:test";
import { cachedFetch, peekCached, invalidateCached } from "../src/utils/prefetchCache.js";

test("gộp các lần gọi trùng và cho đọc đồng bộ sau khi tải xong", async () => {
  let calls = 0;
  const fetcher = async () => ++calls;

  const [a, b] = await Promise.all([cachedFetch("k1", fetcher), cachedFetch("k1", fetcher)]);

  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(calls, 1);
  assert.equal(peekCached("k1"), 1);
});

test("fresh bỏ qua cache; invalidate xoá theo tiền tố", async () => {
  let calls = 0;
  const fetcher = async () => ++calls;

  await cachedFetch("p:1", fetcher);
  assert.equal(await cachedFetch("p:1", fetcher, { fresh: true }), 2);

  invalidateCached("p:");
  assert.equal(peekCached("p:1"), undefined);
});

test("lỗi không bị lưu lại: lần sau tải lại", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    if (calls === 1) throw new Error("mất mạng");
    return "ok";
  };

  await assert.rejects(cachedFetch("err", fetcher), /mất mạng/);
  assert.equal(await cachedFetch("err", fetcher), "ok");
});

test("hết hạn thì không còn đọc được", async () => {
  await cachedFetch("ttl", async () => 1, { ttl: 1 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(peekCached("ttl"), undefined);
});
