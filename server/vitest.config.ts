import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const serverRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(serverRoot, "../packages/shared/src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "../packages/shared/src/**/*.test.ts"],
  },
});
