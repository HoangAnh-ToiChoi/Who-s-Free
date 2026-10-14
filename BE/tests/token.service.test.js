import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import TokenService from "../src/services/token.service.js";

const TEST_SECRET = "token-service-test-secret-min-32-chars-long";

process.env.JWT_SECRET = TEST_SECRET;

test("TokenService.generateAccessToken generates 15m JWT with token_type: access", () => {
  const dummyUser = { id: "11111111-1111-1111-1111-111111111111", email: "user@test.com", role: "member" };
  const token = TokenService.generateAccessToken(dummyUser);

  const decoded = jwt.verify(token, TEST_SECRET);
  assert.equal(decoded.sub, dummyUser.id);
  assert.equal(decoded.email, dummyUser.email);
  assert.equal(decoded.role, "member");
  assert.equal(decoded.token_type, "access");

  // Kiểm tra thời hạn 15 phút (900 giây)
  const durationSeconds = decoded.exp - decoded.iat;
  assert.equal(durationSeconds, 15 * 60);
});

test("TokenService.generateRefreshToken generates high-entropy random non-repeating strings without JWT format", () => {
  const tokens = new Set();
  const iterations = 500;

  for (let i = 0; i < iterations; i += 1) {
    const token = TokenService.generateRefreshToken();
    assert.match(token, /^rt_[0-9a-f-]{36}_[0-9a-f]{64}$/);
    assert.equal(token.includes("."), false, "Refresh token should not be a dot-separated JWT");
    tokens.add(token);
  }

  // Đảm bảo tính độc nhất 100% không trùng lặp
  assert.equal(tokens.size, iterations);
});

test("TokenService.isRefreshTokenExpired validates 5-day expiration TTL accurately", () => {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Vừa tạo -> Chưa hết hạn
  assert.equal(TokenService.isRefreshTokenExpired(new Date(now)), false);

  // Tạo 4 ngày trước -> Chưa hết hạn
  assert.equal(TokenService.isRefreshTokenExpired(new Date(now - 4 * ONE_DAY_MS)), false);

  // Tạo 4 ngày 23 giờ trước -> Chưa hết hạn
  assert.equal(TokenService.isRefreshTokenExpired(new Date(now - (4 * ONE_DAY_MS + 23 * 3600 * 1000))), false);

  // Tạo 5 ngày + 1 giây trước -> Hết hạn
  assert.equal(TokenService.isRefreshTokenExpired(new Date(now - (5 * ONE_DAY_MS + 1000))), true);

  // Tạo 30 ngày trước -> Hết hạn
  assert.equal(TokenService.isRefreshTokenExpired(new Date(now - 30 * ONE_DAY_MS)), true);

  // Null hoặc không hợp lệ -> Coi như hết hạn
  assert.equal(TokenService.isRefreshTokenExpired(null), true);
  assert.equal(TokenService.isRefreshTokenExpired(undefined), true);
  assert.equal(TokenService.isRefreshTokenExpired("invalid-date-string"), true);
});

test("TokenService.generateResetToken produces unique one-time reset token with jti", () => {
  const email = "reset@test.com";
  const token1 = TokenService.generateResetToken(email);
  const token2 = TokenService.generateResetToken(email);

  assert.notEqual(token1, token2, "Mỗi token sinh ra phải có jti duy nhất");

  const decoded1 = jwt.verify(token1, TEST_SECRET);
  assert.equal(decoded1.sub, email);
  assert.equal(decoded1.purpose, "password_reset");
  assert.ok(decoded1.jti);
  assert.equal(decoded1.exp - decoded1.iat, 15 * 60);
});

test("TokenService.cookieOptions and clearAuthCookies configure secure cookies", () => {
  const accessOpts = TokenService.cookieOptions(TokenService.ACCESS_TOKEN_MAX_AGE);
  assert.equal(accessOpts.httpOnly, true);
  assert.equal(accessOpts.sameSite, "lax");
  assert.equal(accessOpts.path, "/");
  assert.equal(accessOpts.maxAge, 15 * 60 * 1000); // 15 phút

  const refreshOpts = TokenService.cookieOptions(TokenService.REFRESH_TOKEN_MAX_AGE);
  assert.equal(refreshOpts.httpOnly, true);
  assert.equal(refreshOpts.sameSite, "lax");
  assert.equal(refreshOpts.path, "/");
  assert.equal(refreshOpts.maxAge, 5 * 24 * 60 * 60 * 1000); // 5 ngày
});
