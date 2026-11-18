import { Router } from "express";
import { loadModules } from "../utils/loadModules.js";

const router = Router();

// Tên file xác định đường dẫn: group.routes.js -> /groups
// Riêng auth và join giữ nguyên số ít.
const SINGULAR_PATHS = ["auth", "join"];

for (const { name, module } of await loadModules(import.meta.url, ".routes.js")) {
  router.use(SINGULAR_PATHS.includes(name) ? `/${name}` : `/${name}s`, module.default);
}

export default router;
