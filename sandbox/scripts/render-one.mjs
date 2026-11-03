// Рендер одной фикстуры/файла в SVG (для быстрой визуальной проверки).
// node sandbox/scripts/render-one.mjs <in.mmd> <out.svg> [--dark]
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const cacheDir = path.join(root, "sandbox", ".cache-render");
rmSync(cacheDir, { recursive: true, force: true });
mkdirSync(cacheDir, { recursive: true });
const outfile = path.join(cacheDir, "ext.mjs");
await build({
  entryPoints: [path.join(root, "src", "services", "mermaid", "ext", "index.ts")],
  bundle: true,
  write: true,
  outfile,
  format: "esm",
  platform: "node",
  target: "node20",
  external: ["node:*"],
  define: { __MERMAID_EXT__: "true" },
  alias: { "@": path.join(root, "src") },
  logLevel: "warning",
});
const { tryRenderExtension } = await import(pathToFileURL(outfile).href);
const src = readFileSync(process.argv[2], "utf8");
const dark = process.argv.includes("--dark");
const svg = await tryRenderExtension(src, dark ? { dark: true } : {});
if (!svg) {
  console.error("FAIL: тип не распознан как расширение");
  process.exit(1);
}
writeFileSync(process.argv[3], svg);
console.log(`OK ${svg.length} bytes -> ${process.argv[3]}`);
rmSync(cacheDir, { recursive: true, force: true });
