/* global process */
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  // GitHub Pages cần sub-path; Vercel (process.env.VERCEL) phục vụ ở root
  base: command === "build" && !process.env.VERCEL ? "/Who-s-Free/" : "/",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    // Khi build production: tự động xóa sạch các console.log rải rác để nhẹ web & bảo mật
    // Giữ lại console.warn để hiển thị Security Banner cảnh báo an ninh
    pure: command === "build" ? ["console.log", "console.debug"] : [],
    drop: command === "build" ? ["debugger"] : [],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
}));
