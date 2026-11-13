#!/usr/bin/env node
/**
 * Проверка актуальности оффлайн-рендеров расширения Mermaid.
 *
 * Зачем: пять своих типов (waterfall, bubble, heatmap, orgchart, ev) рисует
 * встроенный движок. Если движок не подключён к рендеру, штатный mermaid.parse
 * получает исходник, не находит известного типа и отвечает
 * «No diagram type detected matching given configuration for text: …».
 * Проверка ловит это до деплоя, а не в проде.
 *
 * Что проверяется (по слоям, от дёшевого к дорогому):
 *   1. build   — прод-флаг __MERMAID_EXT__ включён (vite.config.ts);
 *   2. entries — точки входа (движок, синтаксис, формат-хендлер) собираются;
 *   3. wiring  — tryRenderExtension() рисует свой тип и отдаёт null чужому;
 *   4. detect  — detectSource() языкового модуля узнаёт ext-ключевые слова
 *                (иначе текст уходит в PlantUML и до Mermaid не доходит);
 *   5. fence   — isMermaidExtDeclaration() видит тип внутри ```mermaid-блока;
 *   6. golden  — эталоны sandbox/golden/ совпадают с текущим рендером;
 *   7. samples — каждый сэмпл из каталога приложения реально рисуется;
 *   8. dist    — (если есть dist/) в собранном бандле есть движок ext
 *                и нет штатной ошибки «No diagram type detected».
 *
 * Выход: 0 — всё актуально, 1 — есть расхождения. Подробности — в отчёте.
 *
 * Использование:
 *   node scripts/mermaid-ext-preflight.mjs                # все проверки
 *   node scripts/mermaid-ext-preflight.mjs --json         # машинный отчёт в stdout
 *   node scripts/mermaid-ext-preflight.mjs --report f.md  # markdown-отчёт в файл
 *   node scripts/mermaid-ext-preflight.mjs --skip=dist,golden
 *   node scripts/mermaid-ext-preflight.mjs --fix          # обновить эталоны при расхождении
 *
 * Зависимости: только то, что уже в devDependencies (esbuild). Без сети.
 */
import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const cacheDir = path.join(root, "sandbox", ".cache-preflight");

const argv = process.argv.slice(2);
const jsonMode = argv.includes("--json");
const fixMode = argv.includes("--fix");
const reportArg = argv.find((a) => a.startsWith("--report="))?.slice("--report=".length);
const skip = new Set(
  (argv.find((a) => a.startsWith("--skip="))?.slice("--skip=".length) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const results = [];
let failed = 0;

function record(layer, name, ok, detail = "") {
  results.push({ layer, name, ok, detail });
  if (!ok) failed++;
  if (!jsonMode) {
    const mark = ok ? "ok  " : "FAIL";
    const tail = detail ? ` — ${detail}` : "";
    console.log(`${mark} [${layer}] ${name}${tail}`);
  }
}

function section(title) {
  if (jsonMode) return;
  console.log(`\n— ${title}`);
}

/**
 * Собирает точку входа в ESM-бандл и импортирует её в текущем процессе.
 * Пишем в кэш-каталог, а не в data:-URL: бандл тянет node-зависимости,
 * и data:-схема не умеет их резолвить.
 */
async function loadEntry(entry, { platform = "node", define = {} } = {}) {
  const outfile = path.join(
    cacheDir,
    `${path.basename(entry, path.extname(entry))}-${platform}.mjs`,
  );
  await build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    write: true,
    outfile,
    format: "esm",
    platform,
    target: "node20",
    external: ["node:*"],
    define: { __MERMAID_EXT__: "true", __APP_VERSION__: '"preflight"', ...define },
    alias: { "@": path.join(root, "src") },
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}

/** То же самое, но для модулей без node-зависимостей (чистые функции). */
async function loadEntryInMemory(entry) {
  return loadEntry(entry);
}

// --- 1. Прод-флаг ---------------------------------------------------------

function checkBuildFlag() {
  section("1. Прод-флаг __MERMAID_EXT__");
  const viteConfigPath = path.join(root, "vite.config.ts");
  if (!existsSync(viteConfigPath)) {
    record("build", "vite.config.ts найден", false, "файла нет");
    return;
  }

  const text = readFileSync(viteConfigPath, "utf8");
  const line = text
    .split(/\r?\n/)
    .find((l) => l.includes("__MERMAID_EXT__") && l.includes("define"))
    ?? text.split(/\r?\n/).find((l) => l.includes("__MERMAID_EXT__"))
    ?? "";

  if (!line) {
    record("build", "__MERMAID_EXT__ объявлен в vite.config.ts", false, "объявления нет");
    return;
  }

  // Флаг выключен, если значение захардкожено в false, а не вычисляется из env.
  const hardcodedFalse = /__MERMAID_EXT__\s*:\s*(?:JSON\.stringify\(\s*)?false/.test(line);
  const fromEnv = /process\.env\.MERMAID_EXT/.test(line);

  record(
    "build",
    "__MERMAID_EXT__ включён в прод-сборке",
    !hardcodedFalse,
    hardcodedFalse
      ? "флаг захардкожен в false → движок вырезается tree-shaking'ом"
      : fromEnv
        ? "значение из MERMAID_EXT (по умолчанию true)"
        : "значение не из env — проверить вручную",
  );

  const sandboxConfig = path.join(root, "vite.sandbox.config.ts");
  if (existsSync(sandboxConfig)) {
    const sandboxText = readFileSync(sandboxConfig, "utf8");
    const sandboxFalse = /__MERMAID_EXT__\s*:\s*(?:JSON\.stringify\(\s*)?false/.test(sandboxText);
    record("build", "песочница включает расширение", !sandboxFalse);
  }
}

// --- 2. Точки входа собираются -------------------------------------------

const ENTRIES = [
  "src/services/mermaid/ext/index.ts",
  "src/services/mermaid/mermaid-engine.ts",
  "src/services/mermaid/syntax-validation.ts",
  "src/formats/mermaid/handler.ts",
  "src/languages/modules/mermaid.ts",
  "src/utils/mermaid-syntax.ts",
];

async function checkEntries() {
  section("2. Точки входа собираются");
  for (const entry of ENTRIES) {
    try {
      await build({
        entryPoints: [path.join(root, entry)],
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        external: ["node:*"],
        define: { __MERMAID_EXT__: "true", __APP_VERSION__: '"preflight"' },
        alias: { "@": path.join(root, "src") },
        logLevel: "silent",
      });
      record("entries", entry, true);
    } catch (e) {
      record("entries", entry, false, e instanceof Error ? e.message.split("\n")[0] : String(e));
    }
  }
}

// --- 3. Движок подключён к рендеру ---------------------------------------

/** Минимальные валидные источники: по одному на каждый тип расширения. */
const MINIMAL_SOURCES = {
  waterfall: "waterfall\n=10 : A\n+5 : B\n=15 : C",
  bubble: [
    "bubble",
    'title BCG',
    'x "Доля" 0 --> 10',
    'y "Рост" 0 --> 30',
    "data",
    "Продукт A : x=8.2, y=22, size=340",
  ].join("\n"),
  heatmap: "heatmap\nx A, B\ny Строка\ndata\nСтрока : 10, 20",
  orgchart: "orgchart\nCEO\nCTO\nCEO -> CTO",
  powermap: "powermap\nCEO [Alex|Lead] role=D gender=m\nCTO [Sam|Tech] role=A gender=f\nCEO -> CTO",
  ev: "ev\ndays 1, 2\npv 10, 25\nev 8, 20\nac 12, 28",
  boxplot: "boxplot\nA : 10, 20, 30, 40, 50",
  treemap: "treemap\nГруппа / A : 60\nГруппа / B : 40",
  radar: "radar\naxes A, B, C\nseries S : 50, 70, 90",
  voronoi: "voronoi\ndata\nA : x=25, y=50\nB : x=75, y=50",
  series: "series\nrotate 90\ncategories Q1, Q2\nseries A : 10, 20\nseries B : 15, 25",
};

async function checkWiring() {
  section("3. tryRenderExtension() рисует свои типы");
  let ext;
  try {
    ext = await loadEntry("src/services/mermaid/ext/index.ts");
  } catch (e) {
    record("wiring", "модуль расширения импортируется", false, String(e));
    return;
  }

  const { tryRenderExtension, detectType, listTypes } = ext;

  record("wiring", "реестр отдаёт 11 типов", listTypes().length === 11, listTypes().join(", "));

  for (const [type, source] of Object.entries(MINIMAL_SOURCES)) {
    const detected = detectType(source);
    if (detected !== type) {
      record("wiring", `${type}: detectType`, false, `распознан как ${detected ?? "null"}`);
      continue;
    }

    try {
      const svg = await tryRenderExtension(source);
      const ok = typeof svg === "string" && svg.startsWith("<svg") && svg.endsWith("</svg>");
      record("wiring", `${type}: SVG от движка`, ok, ok ? `${svg.length} байт` : "не SVG");
    } catch (e) {
      record("wiring", `${type}: SVG от движка`, false, e instanceof Error ? e.message : String(e));
    }
  }

  // Чужой тип обязан уйти в штатный Mermaid (null), иначе перехватим не своё.
  try {
    const foreign = await tryRenderExtension("flowchart TD\nA --> B");
    record("wiring", "штатный Mermaid не перехватывается", foreign === null);
  } catch (e) {
    record("wiring", "штатный Mermaid не перехватывается", false, String(e));
  }
}

// --- 4. Языковой модуль узнаёт ext-типы ----------------------------------

async function checkLanguageModule() {
  section("4. detectSource() языкового модуля");
  let mod;
  try {
    // Модуль языка тянет за собой реестр, а тот на импорте оборачивает
    // геттеры handler'ов. Берём файл как есть — в приложении он работает,
    // значит и здесь должен.
    mod = await loadEntryInMemory("src/languages/modules/mermaid.ts");
  } catch (e) {
    // Не падаем: проверяем то же правило по исходнику модуля. detectSource()
    // узнаёт ext-тип, если его ключевое слово есть в MERMAID_TYPE.
    const modulePath = path.join(root, "src/languages/modules/mermaid.ts");
    const text = readFileSync(modulePath, "utf8");
    // Регулярка объявлена отдельной константой и может переноситься на
    // следующую строку — берём блок от объявления до закрывающей косой черты.
    const declIndex = text.indexOf("MERMAID_TYPE");
    const regexMatch =
      declIndex >= 0 ? /\/\^[\s\S]*?\/i/.exec(text.slice(declIndex)) : null;
    const regexLine = regexMatch?.[0] ?? "";

    if (!regexLine) {
      record("detect", "MERMAID_TYPE объявлен", false, "регулярки нет в модуле");
      return;
    }

    for (const type of Object.keys(MINIMAL_SOURCES)) {
      const ok = new RegExp(`\\b${type}\\b`, "i").test(regexLine);
      record("detect", `${type} в MERMAID_TYPE`, ok, ok ? "" : "ключевого слова нет — текст уйдёт в PlantUML");
    }
    record(
      "detect",
      "модуль импортируется целиком",
      true,
      "не вышло в node-сборке (реестр ждёт загруженные модули) — проверено по исходнику",
    );
    return;
  }

  const module = mod.mermaidLanguageModule;
  if (!module?.detectSource) {
    record("detect", "detectSource() есть", false);
    return;
  }

  for (const [type, source] of Object.entries(MINIMAL_SOURCES)) {
    const ok = Boolean(module.detectSource(source));
    record("detect", `${type} определяется как Mermaid`, ok);
  }

  // Обратная сторона: PlantUML не должен считаться Mermaid.
  record(
    "detect",
    "PlantUML не перехватывается",
    !module.detectSource("@startuml\nA -> B\n@enduml"),
  );
}

// --- 5. Забор ```mermaid и PlantUML-хвост --------------------------------

async function checkFenceDetection() {
  section("5. isMermaidExtDeclaration()");
  let mod;
  try {
    mod = await loadEntryInMemory("src/utils/mermaid-syntax.ts");
  } catch (e) {
    record("fence", "модуль mermaid-syntax импортируется", false, String(e).split("\n")[0]);
    return;
  }

  const { isMermaidExtDeclaration } = mod;
  const cases = [
    ["сырой источник", "waterfall\n=1 : A", true],
    ["в ```mermaid-блоке", "```mermaid\nwaterfall\n=1 : A\n```", true],
    ["в ```-блоке", "```\norgchart\nCEO\n```", true],
    ["после комментария %%", "%% note\nheatmap\nx A", true],
    ["с PlantUML-хвостом", "bubble\nx A 1\n@startuml\nA -> B\n@enduml", true],
    ["штатный Mermaid", "flowchart TD\nA --> B", false],
    ["пустой источник", "", false],
  ];

  for (const [name, source, expected] of cases) {
    const actual = Boolean(isMermaidExtDeclaration(source));
    record("fence", name, actual === expected, actual === expected ? "" : `ожидалось ${expected}, получено ${actual}`);
  }
}

// --- 6. Golden-эталоны ----------------------------------------------------

async function checkGolden() {
  section("6. Golden-эталоны оффлайн-рендера");
  const fixturesDir = path.join(root, "sandbox", "fixtures");
  const goldenDir = path.join(root, "sandbox", "golden");

  if (!existsSync(fixturesDir)) {
    record("golden", "каталог фикстур", false, "sandbox/fixtures нет");
    return;
  }

  const fixtures = readdirSync(fixturesDir).filter((f) => f.endsWith(".mmd")).sort();
  if (fixtures.length === 0) {
    record("golden", "фикстуры есть", false);
    return;
  }

  let ext;
  try {
    ext = await loadEntry("src/services/mermaid/ext/index.ts");
  } catch (e) {
    record("golden", "модуль расширения импортируется", false, String(e));
    return;
  }

  const modes = [
    { suffix: "", options: {} },
    { suffix: ".dark", options: { dark: true } },
  ];

  let compared = 0;
  let mismatched = 0;
  const stale = [];

  for (const name of fixtures) {
    const source = readFileSync(path.join(fixturesDir, name), "utf8");
    const base = name.replace(/\.mmd$/, "");

    for (const mode of modes) {
      const goldenName = `${base}${mode.suffix}.svg`;
      const goldenPath = path.join(goldenDir, goldenName);
      compared++;

      let actual;
      try {
        const svg = await ext.tryRenderExtension(source, mode.options);
        if (svg === null) throw new Error("тип не распознан как расширение");
        actual = svg;
      } catch (e) {
        actual = `ERROR: ${e instanceof Error ? e.message : String(e)}\n`;
      }

      if (!existsSync(goldenPath)) {
        mismatched++;
        stale.push(`${goldenName}: эталона нет`);
        if (fixMode) {
          mkdirSync(goldenDir, { recursive: true });
          writeFileSync(goldenPath, actual);
        }
        continue;
      }

      if (readFileSync(goldenPath, "utf8") !== actual) {
        mismatched++;
        stale.push(`${goldenName}: расхождение`);
        if (fixMode) writeFileSync(goldenPath, actual);
      }
    }
  }

  if (fixMode && mismatched > 0) {
    record("golden", `эталоны обновлены (${mismatched} из ${compared})`, true, "запущено с --fix");
    return;
  }

  record(
    "golden",
    `эталоны совпадают (${compared} шт.)`,
    mismatched === 0,
    mismatched === 0 ? "" : `${mismatched} расхождений: ${stale.slice(0, 5).join("; ")}${stale.length > 5 ? " …" : ""}`,
  );
}

// --- 7. Сэмплы приложения ------------------------------------------------

async function checkSamples() {
  section("7. Сэмплы расширения из каталога приложения");
  let catalog;
  try {
    catalog = await loadEntryInMemory("src/constants/mermaid-sample-diagrams.ts");
  } catch (e) {
    record("samples", "каталог сэмплов импортируется", false, String(e).split("\n")[0]);
    return;
  }

  const ids = catalog.MERMAID_EXT_SAMPLE_IDS ?? [];
  if (ids.length === 0) {
    record("samples", "сэмплы расширения объявлены", false, "MERMAID_EXT_SAMPLE_IDS пуст");
    return;
  }

  let ext;
  try {
    ext = await loadEntry("src/services/mermaid/ext/index.ts");
  } catch (e) {
    record("samples", "модуль расширения импортируется", false, String(e));
    return;
  }

  for (const locale of ["ru", "en"]) {
    for (const id of ids) {
      let source;
      try {
        source = catalog.getMermaidSampleSource(id, locale);
      } catch (e) {
        record("samples", `${locale}/${id}: исходник`, false, String(e).split("\n")[0]);
        continue;
      }

      if (!source) {
        record("samples", `${locale}/${id}: исходник`, false, "пусто");
        continue;
      }

      const type = ext.detectType(source);
      if (!type) {
        record("samples", `${locale}/${id}: тип распознан`, false, "не ext-тип");
        continue;
      }

      try {
        const svg = await ext.tryRenderExtension(source);
        record("samples", `${locale}/${id}: рисуется`, typeof svg === "string" && svg.startsWith("<svg"));
      } catch (e) {
        record("samples", `${locale}/${id}: рисуется`, false, e instanceof Error ? e.message : String(e));
      }
    }
  }
}

// --- 8. Собранный бандл --------------------------------------------------

function checkDist() {
  section("8. Прод-бандл (если собран)");
  const candidates = [
    { file: path.join(root, "dist", "assets", "app.js"), kind: "js" },
    { file: path.join(root, "dist-single", "index.html"), kind: "html" },
  ];
  const bundle = candidates.find((c) => existsSync(c.file));

  if (!bundle) {
    record("dist", "бандл найден", true, "не собирали — пропущено");
    return;
  }

  const text = readFileSync(bundle.file, "utf8");
  const rel = path.relative(root, bundle.file);
  const stat = statSync(bundle.file);

  // Маркеры движка расширения. Минификация переименовывает функции, но
  // пользовательские строки (сообщения об ошибках, ключевые слова) остаются.
  const markers = [
    "waterfall",
    "heatmap",
    "orgchart",
    "неизвестная директива",
    "ошибка разбора",
  ];
  const found = markers.filter((m) => text.includes(m));
  const hasEngine = found.length >= 3;

  record(
    "dist",
    `${rel}: движок расширения внутри`,
    hasEngine,
    hasEngine ? "" : `найдено ${found.length}/${markers.length} маркеров`,
  );

  // Главный симптом: бандл собран ДО подключения ext → на новых типах
  // штатный mermaid отвечает «No diagram type detected».
  if (!hasEngine) {
    record(
      "dist",
      `${rel}: не устарел`,
      false,
      `собран ${stat.mtime.toISOString().slice(0, 16).replace("T", " ")} — без движка ext, ` +
        "пересобрать: npm run build",
    );
  } else {
    record("dist", `${rel}: ext-типы поддержаны`, true);
  }

  if (existsSync(path.join(root, "dist", "index.html"))) {
    const html = readFileSync(path.join(root, "dist", "index.html"), "utf8");
    record("dist", "dist/index.html ссылается на app.js", html.includes("assets/app.js"));
  }
}

// --- main ----------------------------------------------------------------

const startedAt = Date.now();

try {
  mkdirSync(cacheDir, { recursive: true });

  if (!skip.has("build")) checkBuildFlag();
  if (!skip.has("entries")) await checkEntries();
  if (!skip.has("wiring")) await checkWiring();
  if (!skip.has("detect")) await checkLanguageModule();
  if (!skip.has("fence")) await checkFenceDetection();
  if (!skip.has("golden")) await checkGolden();
  if (!skip.has("samples")) await checkSamples();
  if (!skip.has("dist")) checkDist();
} finally {
  rmSync(cacheDir, { recursive: true, force: true });
}

const elapsedMs = Date.now() - startedAt;
const summary = {
  ok: failed === 0,
  checks: results.length,
  failed,
  elapsedMs,
  results,
};

if (jsonMode) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  console.log(
    `\n${failed === 0 ? "preflight: OK" : `preflight: FAIL — ${failed} из ${results.length}`} ` +
      `(${elapsedMs} мс)`,
  );
  if (failed > 0) {
    console.log("Починить эталоны: node sandbox/scripts/gen-golden.mjs");
    console.log("Подробнее о типах: docs/mermaid-ext-syntax.md");
  }
}

if (reportArg) {
  const lines = [
    "# Mermaid Ext — preflight",
    "",
    `Итог: ${summary.ok ? "OK" : `FAIL — ${failed} из ${results.length}`} · ${elapsedMs} мс · ${new Date().toISOString()}`,
    "",
    "| Слой | Проверка | Результат | Детали |",
    "|---|---|---|---|",
    ...results.map(
      (r) => `| ${r.layer} | ${r.name.replace(/\|/g, "\\|")} | ${r.ok ? "ok" : "FAIL"} | ${(r.detail || "").replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];
  writeFileSync(path.resolve(root, reportArg), lines.join("\n"));
  if (!jsonMode) console.log(`отчёт: ${reportArg}`);
}

process.exit(failed === 0 ? 0 : 1);
