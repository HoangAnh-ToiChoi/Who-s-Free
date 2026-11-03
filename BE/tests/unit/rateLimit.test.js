import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import express from "express";
import {
    AUTH_ACCOUNT_LIMIT,
    AUTH_IP_LIMIT,
    authAccountKey,
    authRateLimit,
    normalizeEmail,
} from "../../src/middlewares/rateLimit.middleware.js";

describe("normalizeEmail", () => {
    test("trim + lowercase để cùng một tài khoản không né được limit", () => {
        assert.equal(normalizeEmail("  An@Mail.COM "), "an@mail.com");
    });

    test("giá trị không phải chuỗi → chuỗi rỗng", () => {
        assert.equal(normalizeEmail(undefined), "");
        assert.equal(normalizeEmail({ $ne: 1 }), "");
        assert.equal(normalizeEmail(42), "");
    });
});

describe("authAccountKey", () => {
    test("ghép IP với email đã chuẩn hoá", () => {
        const key = authAccountKey({ ip: "1.2.3.4", body: { email: "A@x.com" } });
        assert.equal(key, "1.2.3.4|a@x.com");
    });

    test("dùng token lời mời khi không có email", () => {
        const key = authAccountKey({ ip: "1.2.3.4", body: {}, params: { token: "tok" } });
        assert.equal(key, "1.2.3.4|tok");
    });

    test("không có định danh → rơi về key theo IP", () => {
        assert.equal(authAccountKey({ ip: "1.2.3.4" }), "1.2.3.4");
    });
});

// Dựng app thật với limiter thật để kiểm tra hành vi end-to-end, không cần DB.
const createServer = () => {
    const app = express();
    app.use(express.json());
    app.post("/login", authRateLimit, (req, res) => res.json({ ok: true }));
    return new Promise((resolve) => {
        const server = app.listen(0, "127.0.0.1", () => resolve(server));
    });
};

const login = (baseUrl, email) =>
    fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "x" }),
    }).then((res) => res.status);

describe("authRateLimit", () => {
    let server;
    let baseUrl;
    const previousEnv = process.env.NODE_ENV;

    before(async () => {
        process.env.NODE_ENV = "development";
        server = await createServer();
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    after(() => {
        process.env.NODE_ENV = previousEnv;
        server.close();
    });

    test("30 người khác email chung một IP đều đăng nhập được", async () => {
        const statuses = await Promise.all(
            Array.from({ length: 30 }, (_, i) => login(baseUrl, `student${i}@class.edu`)),
        );
        assert.ok(statuses.every((s) => s === 200), `có request bị chặn: ${statuses}`);
    });

    test(`một email thử quá ${AUTH_ACCOUNT_LIMIT} lần thì bị 429`, async () => {
        const statuses = [];
        for (let i = 0; i <= AUTH_ACCOUNT_LIMIT; i += 1) {
            statuses.push(await login(baseUrl, "victim@class.edu"));
        }
        assert.equal(statuses.filter((s) => s === 200).length, AUTH_ACCOUNT_LIMIT);
        assert.equal(statuses.at(-1), 429);
    });

    test(`một IP vượt ${AUTH_IP_LIMIT} request thì bị 429 dù đổi email`, async () => {
        // 30 + 11 request đã dùng ở các test trên, cùng IP 127.0.0.1
        const remaining = AUTH_IP_LIMIT - 41;
        const statuses = await Promise.all(
            Array.from({ length: remaining }, (_, i) => login(baseUrl, `spray${i}@x.com`)),
        );
        assert.ok(statuses.every((s) => s === 200));
        assert.equal(await login(baseUrl, "one-more@x.com"), 429);
    });
});
