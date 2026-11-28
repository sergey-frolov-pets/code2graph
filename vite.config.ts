import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(path.join(appRoot, "package.json"), "utf8"),
) as { version: string };

/**
 * Один IIFE нужен только офлайн-файлу dist-single: динамические import()
 * туда вклеиваются в ту же область видимости. esbuild тогда может выдать
 * два `const` с одним именем (`Identifier 'AXs' has already been declared`),
 * и страница умирает на «Ошибка запуска».
 * Обычная сборка — ES-модули с отдельными чанками: у каждого своя область,
 * а лендинг не ждёт mermaid и редактор.
 */
const singleFile = process.env.CODE2GRAPH_SINGLE_FILE === "1";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    // Расширение Mermaid включено в проде: пять своих типов диаграмм
    // (waterfall, bubble, heatmap, orgchart, ev) рисует встроенный движок.
    // Выключить сборку можно переменной окружения MERMAID_EXT=false.
    __MERMAID_EXT__: JSON.stringify(process.env.MERMAID_EXT !== "false"),
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
  esbuild: singleFile
    ? {
        // В одном файле переименование идентификаторов и даёт повторный const.
        minifyIdentifiers: false,
        minifySyntax: true,
        minifyWhitespace: true,
      }
    : undefined,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2018",
    cssCodeSplit: !singleFile,
    modulePreload: { polyfill: false },
    // Тяжёлые чанки (D2, мастер, elk) грузятся отдельно, не на первом экране.
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      output: singleFile
        ? {
            format: "iife",
            name: "PlantumlSmetanaApp",
            inlineDynamicImports: true,
            entryFileNames: "assets/app.js",
          }
        : {
            format: "es",
            entryFileNames: "assets/[name]-[hash].js",
            chunkFileNames: "assets/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
          },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "packages/shared/src/**/*.test.ts"],
    // На слабой машине монтирование галереи визарда занимает ~3.5 с —
    // дефолтные 5 с дают ложные падения. Остальные тесты укладываются в 2 с.
    testTimeout: 20000,
    alias: {
      "@d2lang/d2": path.resolve(
        appRoot,
        "node_modules/@d2lang/d2/dist/node-esm/index.js",
      ),
    },
  },
});
