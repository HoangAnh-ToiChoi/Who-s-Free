import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { fileURLToPath, pathToFileURL } from "node:url";

const folder = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Tên file xác định đường dẫn: group.routes.js -> /groups
// Riêng auth và join giữ nguyên số ít.
const SINGULAR_PATHS = ["auth", "join"];

const files = fs.readdirSync(folder).filter((f) => f.endsWith(".routes.js"));

for (const file of files) {
  const name = file.replace(".routes.js", "");
  const urlPath = SINGULAR_PATHS.includes(name) ? `/${name}` : `/${name}s`;
  const module = await import(pathToFileURL(path.join(folder, file)).href);
  router.use(urlPath, module.default);
}

export default router;
