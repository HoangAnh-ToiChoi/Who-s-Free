import { loadModules } from "../utils/loadModules.js";

/**
 * Danh sách job định kỳ. Mỗi file *.job.js export default { name, schedule, description, run, selfLogged? }.
 * - name: đường dẫn gọi job: POST /api/jobs/<name> kèm header x-job-secret
 * - schedule: lịch cron gợi ý (giờ Việt Nam) để cài trên cron-job.org
 * - selfLogged: job tự ghi job_runs (không để runner ghi trùng)
 * Thêm file *.job.js mới vào thư mục này là tự có, không phải khai báo thêm.
 *
 * Sao lưu DB không chạy ở đây (Render không có pg_dump): xem .github/workflows/db-backup.yml.
 */
const loadJobs = async () =>
  new Map((await loadModules(import.meta.url, ".job.js")).map(({ module }) => [module.default.name, module.default]));

export const getJob = async (name) => (await loadJobs()).get(name) ?? null;
export const listJobs = async () => [...(await loadJobs()).values()];
