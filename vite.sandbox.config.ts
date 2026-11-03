import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

/**
 * Отдельный конфиг песочницы для расширений Mermaid.
 * Прод-конфиг (vite.config.ts) НЕ трогается: там __MERMAID_EXT__ = false,
 * и весь код расширения вырезается tree-shaking'ом.
 */
export default defineConfig({
  root: path.resolve(appRoot, "sandbox"),
  define: {
    __MERMAID_EXT__: JSON.stringify(true),
    __APP_VERSION__: JSON.stringify("sandbox"),
  },
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
      "@shared": path.resolve(appRoot, "packages/shared/src"),
      "@sandbox": path.resolve(appRoot, "sandbox"),
    },
  },
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    fs: { allow: [appRoot] },
  },
  build: {
    outDir: path.resolve(appRoot, "dist-sandbox"),
    emptyOutDir: true,
    target: "es2018",
  },
});
