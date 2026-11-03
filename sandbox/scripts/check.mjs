// Быстрая проверка песочницы без vue-tsc (на 1 CPU он падает по OOM).
// 1) esbuild-бандл точек входа (ловит ошибки импортов/синтаксиса)
// 2) detectType на всех фикстурах (через esbuild-транспиляцию registry.ts)
import { build } from "esbuild";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
let failed = false;

const entryPoints = [
  "src/services/mermaid/ext/index.ts",
  "src/services/mermaid/mermaid-engine.ts",
  "src/services/mermaid/syntax-validation.ts",
].map((p) => path.join(root, p));

try {
  await build({
    entryPoints,
    outdir: path.join(root, "sandbox/.cache"),
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    external: ["node:*"],
    define: { __MERMAID_EXT__: "true" },
    alias: { "@": path.join(root, "src") },
    logLevel: "warning",
  });
  console.log("esbuild: OK");
} catch (e) {
  failed = true;
  console.error("esbuild: FAIL", e.message);
}

let detectType = null;
try {
  const res = await build({
    entryPoints: [path.join(root, "src/services/mermaid/ext/registry.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    logLevel: "warning",
  });
  const code = res.outputFiles[0].text;
  const mod = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  detectType = mod.detectType;
  console.log("registry: OK");
} catch (e) {
  failed = true;
  console.error("registry: FAIL", e.message);
}

const dir = path.join(root, "sandbox/fixtures");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".mmd"))) {
  const src = readFileSync(path.join(dir, file), "utf8");
  const type = detectType ? detectType(src) : "?";
  const expected = file.split("-")[1];
  const ok = detectType ? type === expected : false;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${file} -> ${type}`);
}

process.exit(failed ? 1 : 0);
