// Генерация golden-эталонов SVG для фикстур расширения Mermaid.
// Рендер детерминирован (без DOM, без времени, без случайности), поэтому
// эталон — просто сохранённый вывод tryRenderExtension.
//
// Использование:
//   node sandbox/scripts/gen-golden.mjs          — записать эталоны
//   node sandbox/scripts/gen-golden.mjs --check  — только сверить (exit 1 при расхождении)
//
// Битые фикстуры (ожидаемая ошибка разбора) в эталоны не попадают:
// для них эталон — файл .error.txt с текстом ошибки.
import { build } from "esbuild";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const fixturesDir = path.join(root, "sandbox", "fixtures");
const goldenDir = path.join(root, "sandbox", "golden");
const cacheDir = path.join(root, "sandbox", ".cache-golden");

const checkOnly = process.argv.includes("--check");

// 1) Собираем точку входа расширения в один ESM-файл — без vite, без DOM.
rmSync(cacheDir, { recursive: true, force: true });
const outfile = path.join(cacheDir, "ext.mjs");
await build({
  entryPoints: [path.join(root, "src/services/mermaid/ext/index.ts")],
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

// 2) Прогоняем все фикстуры в двух режимах: светлая и тёмная тема.
const MODES = [
  { suffix: "", options: {} },
  { suffix: ".dark", options: { dark: true } },
];

if (!checkOnly) mkdirSync(goldenDir, { recursive: true });

const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".mmd"))
  .sort();

let written = 0;
let mismatched = 0;
const failures = [];

for (const name of fixtures) {
  const source = readFileSync(path.join(fixturesDir, name), "utf8");
  const base = name.replace(/\.mmd$/, "");

  for (const mode of MODES) {
    const goldenName = `${base}${mode.suffix}.svg`;
    const goldenPath = path.join(goldenDir, goldenName);

    let actual;
    try {
      const svg = await tryRenderExtension(source, mode.options);
      if (svg === null) throw new Error("тип не распознан как расширение");
      actual = svg;
    } catch (e) {
      // Ожидаемая ошибка разбора: эталон — текст ошибки, а не SVG.
      actual = `ERROR: ${e instanceof Error ? e.message : String(e)}\n`;
    }

    if (checkOnly) {
      if (!existsSync(goldenPath)) {
        failures.push(`${goldenName}: эталона нет`);
        mismatched++;
        continue;
      }
      const expected = readFileSync(goldenPath, "utf8");
      if (expected !== actual) {
        failures.push(`${goldenName}: расхождение с эталоном`);
        mismatched++;
      }
    } else {
      writeFileSync(goldenPath, actual);
      written++;
    }
  }
}

// 3) Убираем устаревшие эталоны (фикстуру удалили — эталон тоже).
if (!checkOnly && existsSync(goldenDir)) {
  const expectedNames = new Set(
    fixtures.flatMap((f) => MODES.map((m) => `${f.replace(/\.mmd$/, "")}${m.suffix}.svg`)),
  );
  for (const f of readdirSync(goldenDir)) {
    if (!expectedNames.has(f)) {
      rmSync(path.join(goldenDir, f), { force: true });
      console.log(`удалён устаревший эталон: ${f}`);
    }
  }
}

rmSync(cacheDir, { recursive: true, force: true });

if (checkOnly) {
  if (mismatched > 0) {
    console.error(`golden: FAIL — ${mismatched} расхождений из ${fixtures.length * MODES.length}`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`golden: OK — ${fixtures.length * MODES.length} эталонов совпали`);
} else {
  console.log(`golden: записано ${written} эталонов из ${fixtures.length} фикстур`);
}
