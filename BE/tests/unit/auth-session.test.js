import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { installFakeRefreshSessions } from "../helpers/fakeRefreshSessions.js";

process.env.JWT_SECRET ||= "auth-session-unit-test-secret-at-least-32-chars";
const { default: RefreshSessionModel } = await import("../../src/models/refresh-session.model.js");
const { default: AuthSessionService } = await import("../../src/services/auth-session.service.js");
const { default: TokenService } = await import("../../src/services/token.service.js");

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "u@test.dev" };
const PHONE = { kind: "mobile", userAgent: "iPhone" };
const PC = { kind: "desktop", userAgent: "Windows" };
let sessions;
const sidOf = (accessToken) => TokenService.verifyAccessToken(accessToken).sid;

before(() => {
  sessions = installFakeRefreshSessions(RefreshSessionModel, (id) => ({ id, email: USER.email, full_name: "U" }));
});
after(() => sessions.restore());
beforeEach(() => sessions.rows.clear());

test("issue: access token mang sid của phiên; điện thoại và máy tính cùng tồn tại", async () => {
  const phone = await AuthSessionService.issue(USER, PHONE);
  const pc = await AuthSessionService.issue(USER, PC);
  assert.equal(sessions.rows.size, 2);
  assert.ok(await AuthSessionService.isActive(sidOf(phone.accessToken)));
  assert.ok(await AuthSessionService.isActive(sidOf(pc.accessToken)));
});

test("issue: điện thoại thứ hai thay điện thoại trước — phiên cũ hết sống ngay cả khi đang được cache", async () => {
  const first = await AuthSessionService.issue(USER, PHONE);
  assert.ok(await AuthSessionService.isActive(sidOf(first.accessToken))); // nạp vào cache
  await AuthSessionService.issue(USER, { kind: "mobile", userAgent: "Android" });
  assert.equal(await AuthSessionService.isActive(sidOf(first.accessToken)), false);
  await assert.rejects(AuthSessionService.refresh(first.refreshToken), { errorCode: "INVALID_REFRESH_TOKEN" });
});

test("refresh: đổi token, giữ sid; token cũ không dùng lại được", async () => {
  const issued = await AuthSessionService.issue(USER, PHONE);
  const next = await AuthSessionService.refresh(issued.refreshToken);
  assert.notEqual(next.refreshToken, issued.refreshToken);
  assert.equal(sidOf(next.accessToken), sidOf(issued.accessToken));
  assert.equal(next.user.email, USER.email);
  await assert.rejects(AuthSessionService.refresh(issued.refreshToken), { errorCode: "INVALID_REFRESH_TOKEN" });
});

test("refresh: thiếu token, token lạ, phiên quá 15 ngày không dùng (bị xoá)", async () => {
  await assert.rejects(AuthSessionService.refresh(""), { errorCode: "MISSING_REFRESH_TOKEN" });
  await assert.rejects(AuthSessionService.refresh("rt_unknown"), { errorCode: "INVALID_REFRESH_TOKEN" });
  sessions.seed(USER.id, "rt_old", { lastUsedAt: new Date(Date.now() - 16 * 24 * 3600 * 1000) });
  await assert.rejects(AuthSessionService.refresh("rt_old"), { errorCode: "REFRESH_TOKEN_EXPIRED" });
  assert.equal(sessions.findByToken("rt_old"), null);
});

test("revoke chỉ đăng xuất thiết bị đó; revokeAll đăng xuất hết", async () => {
  const phone = await AuthSessionService.issue(USER, PHONE);
  const pc = await AuthSessionService.issue(USER, PC);
  await AuthSessionService.revoke(phone.refreshToken);
  assert.equal(await AuthSessionService.isActive(sidOf(phone.accessToken)), false);
  assert.ok(await AuthSessionService.isActive(sidOf(pc.accessToken)));
  await AuthSessionService.revokeAll(USER.id);
  assert.equal(await AuthSessionService.isActive(sidOf(pc.accessToken)), false);
  await AuthSessionService.revoke(undefined); // không có cookie: không lỗi
});
