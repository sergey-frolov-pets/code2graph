import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(path.join(appRoot, "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
      "@shared": path.resolve(appRoot, "packages/shared/src"),
    },
  },
  plugins: [vue()],
  base: "./",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2018",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        name: "PlantumlSmetanaApp",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "packages/shared/src/**/*.test.ts"],
  },
});
