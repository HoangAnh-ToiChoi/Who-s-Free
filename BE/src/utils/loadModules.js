import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const cache = new Map();

/**
 * Nạp mọi file có đuôi `suffix` trong thư mục chứa `fromUrl` (truyền import.meta.url của file gọi).
 * Trả về [{ name, module }] theo thứ tự tên file; name = tên file bỏ đuôi (vd "group" từ group.routes.js).
 * Kết quả được nhớ lại; lần nạp lỗi thì bỏ nhớ để lần gọi sau thử lại.
 */
export function loadModules(fromUrl, suffix) {
  const dir = path.dirname(fileURLToPath(fromUrl));
  const key = `${dir}|${suffix}`;
  if (!cache.has(key)) {
    const files = readdirSync(dir)
      .filter((file) => file.endsWith(suffix))
      .sort();
    const loading = Promise.all(
      files.map(async (file) => ({
        name: file.slice(0, -suffix.length),
        module: await import(pathToFileURL(path.join(dir, file)).href),
      })),
    ).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, loading);
  }
  return cache.get(key);
}
