#!/usr/bin/env node
/**
 * Замена устаревших оффлайн-рендеров расширения Mermaid на свежие.
 *
 * Парный скрипт к scripts/mermaid-ext-preflight.mjs: тот только сообщает
 * «эталон расходится», этот перерисовывает все эталоны текущим движком.
 *
 * Что делает по шагам:
 *   1. проверка предусловий — есть ли фикстуры, движок, esbuild;
 *   2. бэкап текущих эталонов в sandbox/golden.bak/<дата>/ (откат одной командой);
 *   3. сборка движка расширения в ESM (esbuild, без Vite и без DOM);
 *   4. рендер каждой фикстуры в двух темах (светлая/тёмная);
 *   5. запись только изменившихся файлов (остальные не трогаем — чистая git-история);
 *   6. удаление осиротевших эталонов (фикстуру убрали — эталон тоже);
 *   7. сводка: сколько обновлено, сколько добавлено, сколько удалено;
 *   8. --verify: после записи прогнать preflight и упасть, если он не зелёный.
 *
 * Использование:
 *   node scripts/mermaid-ext-refresh.mjs                 # обновить расходящиеся
 *   node scripts/mermaid-ext-refresh.mjs --dry-run       # показать, что изменится
 *   node scripts/mermaid-ext-refresh.mjs --all           # перезаписать все эталоны
 *   node scripts/mermaid-ext-refresh.mjs --only=waterfall,ev
 *   node scripts/mermaid-ext-refresh.mjs --verify        # обновить + проверить
 *   node scripts/mermaid-ext-refresh.mjs --no-backup     # без копии (для CI)
 *
 * Выход: 0 — всё обновлено, 1 — ошибка (нет фикстур, рендер упал, verify красный).
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const fixturesDir = path.join(root, "sandbox", "fixtures");
const goldenDir = path.join(root, "sandbox", "golden");
const cacheDir = path.join(root, "sandbox", ".cache-refresh");

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const rewriteAll = argv.includes("--all");
const noBackup = argv.includes("--no-backup");
const verify = argv.includes("--verify");
const only = new Set(
  (argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const MODES = [
  { suffix: "", options: {} },
  { suffix: ".dark", options: { dark: true } },
];

function fail(message) {
  console.error(`refresh: FAIL — ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(dryRun ? `[dry-run] ${message}` : message);
}

// --- 1. Предусловия -------------------------------------------------------

if (!existsSync(fixturesDir)) {
  fail(`нет каталога фикстур ${path.relative(root, fixturesDir)}`);
}

const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".mmd"))
  .sort();

if (fixtures.length === 0) {
  fail("в sandbox/fixtures нет ни одного .mmd — обновлять нечего");
}

// --- 2. Бэкап -------------------------------------------------------------

let backupDir = null;
if (!dryRun && !noBackup && existsSync(goldenDir)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  backupDir = path.join(root, "sandbox", "golden.bak", stamp);
  mkdirSync(backupDir, { recursive: true });
  cpSync(goldenDir, backupDir, { recursive: true });
  console.log(`бэкап эталонов: ${path.relative(root, backupDir)}`);
}

// --- 3. Сборка движка -----------------------------------------------------

mkdirSync(cacheDir, { recursive: true });
const outfile = path.join(cacheDir, "ext.mjs");

try {
  await build({
    entryPoints: [path.join(root, "src/services/mermaid/ext/index.ts")],
    bundle: true,
    write: true,
    outfile,
    format: "esm",
    platform: "node",
    target: "node20",
    external: ["node:*"],
    define: { __MERMAID_EXT__: "true", __APP_VERSION__: '"refresh"' },
    alias: { "@": path.join(root, "src") },
    logLevel: "silent",
  });
} catch (e) {
  rmSync(cacheDir, { recursive: true, force: true });
  fail(`движок не собрался: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
}

const { tryRenderExtension, detectType } = await import(pathToFileURL(outfile).href);

// --- 4–6. Рендер, запись, уборка -----------------------------------------

mkdirSync(goldenDir, { recursive: true });

const stats = { updated: [], added: [], unchanged: 0, removed: [], errors: [] };
const expectedNames = new Set();

for (const name of fixtures) {
  const base = name.replace(/\.mmd$/, "");
  const type = detectType(readFileSync(path.join(fixturesDir, name), "utf8"));

  if (!type) {
    stats.errors.push(`${name}: не ext-тип — эталон не создаётся`);
    continue;
  }

  if (only.size > 0 && !only.has(type) && !only.has(base)) {
    continue;
  }

  const source = readFileSync(path.join(fixturesDir, name), "utf8");

  for (const mode of MODES) {
    const goldenName = `${base}${mode.suffix}.svg`;
    const goldenPath = path.join(goldenDir, goldenName);
    expectedNames.add(goldenName);

    let actual;
    try {
      const svg = await tryRenderExtension(source, mode.options);
      if (svg === null) throw new Error("тип не распознан как расширение");
      actual = svg;
    } catch (e) {
      // Ожидаемая ошибка разбора — тоже «рендер»: эталон хранит текст ошибки.
      actual = `ERROR: ${e instanceof Error ? e.message : String(e)}\n`;
    }

    const exists = existsSync(goldenPath);
    const previous = exists ? readFileSync(goldenPath, "utf8") : null;

    if (!rewriteAll && previous === actual) {
      stats.unchanged++;
      continue;
    }

    if (dryRun) {
      (exists ? stats.updated : stats.added).push(goldenName);
      continue;
    }

    writeFileSync(goldenPath, actual);
    (exists ? stats.updated : stats.added).push(goldenName);
  }
}

// Осиротевшие эталоны: фикстуры больше нет — файл не нужен.
if (!dryRun && only.size === 0 && existsSync(goldenDir)) {
  for (const file of readdirSync(goldenDir)) {
    if (!file.endsWith(".svg")) continue;
    if (expectedNames.has(file)) continue;
    rmSync(path.join(goldenDir, file), { force: true });
    stats.removed.push(file);
  }
}

rmSync(cacheDir, { recursive: true, force: true });

// --- 7. Сводка ------------------------------------------------------------

const touched = stats.updated.length + stats.added.length + stats.removed.length;

if (touched === 0 && stats.errors.length === 0) {
  console.log(`refresh: нечего обновлять — все ${stats.unchanged} эталонов актуальны`);
} else {
  log(`обновлено: ${stats.updated.length}, добавлено: ${stats.added.length}, ` +
    `удалено: ${stats.removed.length}, без изменений: ${stats.unchanged}`);

  for (const f of stats.updated) log(`  ~ ${f}`);
  for (const f of stats.added) log(`  + ${f}`);
  for (const f of stats.removed) log(`  - ${f}`);
}

for (const e of stats.errors) console.error(`  ! ${e}`);

if (backupDir) {
  console.log(`откат: cp -r ${path.relative(root, backupDir)}/. ${path.relative(root, goldenDir)}/`);
}

if (stats.errors.length > 0) {
  fail(`${stats.errors.length} фикстур не отрендерились`);
}

// --- 8. Проверка ----------------------------------------------------------

if (verify && !dryRun) {
  console.log("\nпроверка: node scripts/mermaid-ext-preflight.mjs --skip=entries,dist");
  const res = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "mermaid-ext-preflight.mjs"), "--skip=entries,dist"],
    { stdio: "inherit", cwd: root },
  );

  if (res.status !== 0) {
    fail("preflight после обновления красный — см. вывод выше");
  }
}

process.exit(0);
