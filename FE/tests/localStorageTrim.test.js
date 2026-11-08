import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { toStoredUser } from "../src/utils/authUser.js";
import {
  setCachedSlots,
  getCachedSlots,
  clearAllAvailabilityCache,
} from "../src/utils/availabilityCache.js";

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    get size() {
      return data.size;
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = createMemoryStorage();
});

test("toStoredUser chỉ giữ id/name/fullName/avatarUrl", () => {
  const stored = toStoredUser({
    id: "u1",
    name: "An",
    fullName: "Nguyễn An",
    email: "an@example.com",
    avatarUrl: "https://x/a.png",
    role: "Member",
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  assert.deepEqual(stored, {
    id: "u1",
    name: "An",
    fullName: "Nguyễn An",
    avatarUrl: "https://x/a.png",
  });
});

test("toStoredUser trả null cho input rỗng hoặc thiếu id", () => {
  assert.equal(toStoredUser(null), null);
  assert.equal(toStoredUser(undefined), null);
  assert.equal(toStoredUser("abc"), null);
  assert.equal(toStoredUser({ email: "an@example.com" }), null);
});

test("clearAllAvailabilityCache xoá lịch rảnh đã cache", () => {
  setCachedSlots("session-1", "u1", [{ day: 1, start: "09:00" }]);
  assert.ok(getCachedSlots("session-1", "u1"));

  clearAllAvailabilityCache();

  assert.equal(getCachedSlots("session-1", "u1"), null);
  assert.equal(globalThis.localStorage.size, 0);
});

test("clearAllAvailabilityCache không ném lỗi khi localStorage bị chặn", () => {
  globalThis.localStorage = {
    removeItem() {
      throw new Error("SecurityError");
    },
  };
  assert.doesNotThrow(() => clearAllAvailabilityCache());
});
