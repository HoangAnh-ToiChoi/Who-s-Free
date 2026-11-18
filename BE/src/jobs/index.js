import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Danh sách job định kỳ. Mỗi file *.job.js export default { name, schedule, description, run, selfLogged? }.
 * - name: đường dẫn gọi job: POST /api/jobs/<name> kèm header x-job-secret
 * - schedule: lịch cron gợi ý (giờ Việt Nam) để cài trên cron-job.org
 * - selfLogged: job tự ghi job_runs (không để runner ghi trùng)
 * Thêm file *.job.js mới vào thư mục này là tự có, không phải khai báo thêm.
 *
 * Sao lưu DB không chạy ở đây (Render không có pg_dump): xem .github/workflows/db-backup.yml.
 */
const dir = path.dirname(fileURLToPath(import.meta.url));
let cached;

const loadJobs = () => {
  cached ??= Promise.all(
    readdirSync(dir)
      .filter((file) => file.endsWith(".job.js"))
      .map((file) => import(pathToFileURL(path.join(dir, file)).href).then((m) => m.default)),
  ).then((jobs) => new Map(jobs.map((job) => [job.name, job])));
  return cached;
};

export const getJob = async (name) => (await loadJobs()).get(name) ?? null;
export const listJobs = async () => [...(await loadJobs()).values()];
