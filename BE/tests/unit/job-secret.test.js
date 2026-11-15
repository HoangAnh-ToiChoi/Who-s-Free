import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { requireJobSecret } from "../../src/middlewares/job-secret.middleware.js";

let saved;
beforeEach(() => {
  saved = process.env.JOB_SECRET;
});
afterEach(() => {
  if (saved === undefined) delete process.env.JOB_SECRET;
  else process.env.JOB_SECRET = saved;
});

const run = (headers = {}) => {
  const req = { get: (name) => headers[name.toLowerCase()] };
  let nextArg = "not-called";
  requireJobSecret(req, {}, (arg) => {
    nextArg = arg;
  });
  return nextArg;
};

describe("requireJobSecret", () => {
  test("secret đúng: cho đi tiếp", () => {
    process.env.JOB_SECRET = "s3cret-value";
    assert.equal(run({ "x-job-secret": "s3cret-value" }), undefined);
  });

  test("thiếu header: 401", () => {
    process.env.JOB_SECRET = "s3cret-value";
    const err = run({});
    assert.equal(err.statusCode, 401);
    assert.equal(err.errorCode, "INVALID_JOB_SECRET");
  });

  test("sai secret (cùng độ dài, khác độ dài, rỗng): 401, không ném lỗi timingSafeEqual", () => {
    process.env.JOB_SECRET = "s3cret-value";
    for (const bad of ["s3cret-valuX", "short", "s3cret-value-but-much-longer", ""]) {
      assert.equal(run({ "x-job-secret": bad }).statusCode, 401, bad);
    }
  });

  test("JOB_SECRET chưa cấu hình: 503 dù client gửi gì, kể cả header rỗng", () => {
    delete process.env.JOB_SECRET;
    assert.equal(run({ "x-job-secret": "anything" }).statusCode, 503);
    assert.equal(run({}).statusCode, 503);
    assert.equal(run({ "x-job-secret": "" }).errorCode, "JOB_NOT_CONFIGURED");
  });
});
