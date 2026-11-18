import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
let cached;

// Quét thư mục bằng fs, file .js nào (trừ index.js) cũng được import động và gộp export lại.
// Thêm file mới vào schedule/ là tự có, không phải khai báo danh sách.
export const loadSchedule = () => {
  cached ??= Promise.all(
    readdirSync(dir)
      .filter((file) => file.endsWith(".js") && file !== "index.js")
      .map((file) => import(pathToFileURL(path.join(dir, file)).href)),
  ).then((modules) => Object.assign({}, ...modules));
  return cached;
};
