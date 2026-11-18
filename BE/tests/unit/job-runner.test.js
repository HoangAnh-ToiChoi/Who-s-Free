import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

process.env.SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const { default: JobRunModel } = await import("../../src/models/job-run.model.js");
const { default: CleanupModel } = await import("../../src/models/cleanup.model.js");
const { default: SupabaseAuthModel } = await import("../../src/models/supabase-auth.model.js");
const { default: sessionDeadlineService } = await import("../../src/services/session-deadline.service.js");
const { default: jobService } = await import("../../src/services/job.service.js");
const { listJobs } = await import("../../src/jobs/index.js");

const mocks = [];
const fake = (obj, name, impl) => mocks.push(mock.method(obj, name, impl));
afterEach(() => mocks.splice(0).forEach((m) => m.mock.restore()));

function fakeRuns() {
  const runs = [];
  fake(JobRunModel, "start", async (name) => (runs.push({ name }), runs.length));
  fake(JobRunModel, "finish", async (id, result) => Object.assign(runs[id - 1], result));
  return runs;
}

test("danh sách job có đủ 3 job, mỗi job có lịch cron và mô tả", async () => {
  const jobs = await listJobs();
  assert.deepEqual(jobs.map((j) => j.name).sort(), ["otp-cleanup", "session-deadlines", "unverified-accounts"]);
  for (const job of jobs) {
    assert.match(job.schedule, /^\S+ \S+ \S+ \S+ \S+$/);
    assert.ok(job.description);
  }
});

test("job không tồn tại → 404 JOB_NOT_FOUND", async () => {
  await assert.rejects(jobService.run("khong-co"), { statusCode: 404, errorCode: "JOB_NOT_FOUND" });
});

test("otp-cleanup: xoá OTP quên mật khẩu + xoá mã băm xác thực email cũ hơn 3 ngày, ghi stats vào job_runs", async () => {
  const runs = fakeRuns();
  fake(CleanupModel, "deleteOldPasswordResetOtps", async (days) => (assert.equal(days, 3), 2));
  fake(CleanupModel, "scrubOldEmailVerificationCodes", async (days) => (assert.equal(days, 3), 5));
  const stats = await jobService.run("otp-cleanup");
  assert.deepEqual(stats, { passwordResetOtpsDeleted: 2, emailCodesScrubbed: 5 });
  assert.deepEqual(runs, [{ name: "otp-cleanup", stats }]);
});

test("unverified-accounts: một tài khoản xoá lỗi không chặn các tài khoản khác", async () => {
  fakeRuns();
  mocks.push(mock.method(console, "warn", () => {}));
  fake(CleanupModel, "findStaleUnverifiedAccounts", async (days) => (assert.equal(days, 7), [{ id: "a" }, { id: "b" }]));
  fake(CleanupModel, "deletePublicUser", async () => {});
  fake(SupabaseAuthModel, "deleteUser", async (id) => {
    if (id === "b") throw new Error("supabase down");
  });
  assert.deepEqual(await jobService.run("unverified-accounts"), { found: 2, deleted: 1, failed: 1 });
});

test("job lỗi: ghi error vào job_runs rồi ném tiếp", async () => {
  const runs = fakeRuns();
  fake(CleanupModel, "deleteOldPasswordResetOtps", async () => {
    throw new Error("db down");
  });
  fake(CleanupModel, "scrubOldEmailVerificationCodes", async () => 0);
  await assert.rejects(jobService.run("otp-cleanup"), /db down/);
  assert.equal(runs[0].error, "db down");
});

test("session-deadlines tự ghi job_runs: runner không ghi trùng", async () => {
  const runs = fakeRuns();
  fake(sessionDeadlineService, "run", async () => ({ remindersSent: 1 }));
  assert.deepEqual(await jobService.run("session-deadlines"), { remindersSent: 1 });
  assert.equal(runs.length, 0);
});
