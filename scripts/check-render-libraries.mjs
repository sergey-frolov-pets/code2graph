#!/usr/bin/env node
/**
 * Проверка и обновление библиотек рендеринга диаграмм.
 *
 * npm-движки читаются из package-lock.json и сверяются с dist-tag latest.
 * Вендорные PlantUML-библиотеки (C4, Archimate) сверяются с последним
 * GitHub Release. Пины лежат в scripts/render-libraries.json.
 *
 * Использование:
 *   node scripts/check-render-libraries.mjs            # только отчёт
 *   node scripts/check-render-libraries.mjs --update   # поднять версии
 *
 * --update ставит новые npm-версии и заново копирует git-библиотеки,
 * у которых вышел релиз. Коммит и pull request делает workflow.
 *
 * Выход: 0 — отчёт готов (обновления могут быть), 1 — ошибка запроса или записи.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  APP_ROOT,
  PACKAGE_JSON_PATH,
  PACKAGE_LOCK_PATH,
  SOURCE_GIT,
  SOURCE_NPM,
  buildReport,
  fetchGithubRelease,
  fetchNpmLatest,
  formatCommitMessage,
  formatGithubSummary,
  formatPullRequestBody,
  formatReport,
  nextGitPin,
  readCatalog,
  updatesInReport,
  writeCatalog,
} from "./render-libraries.mjs";

const UPDATE_FLAG = "--update";

function fail(message) {
  console.error(`render-libs: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assertDeclared(packageJson, name) {
  if (typeof packageJson.dependencies?.[name] !== "string") {
    fail(`${name} нет в dependencies package.json`);
  }
}

async function loadLatest(catalog) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const npmLatests = new Map();
  const gitReleases = new Map();

  await Promise.all(
    catalog.npm.map(async (name) => {
      npmLatests.set(name, await fetchNpmLatest(name));
    }),
  );

  await Promise.all(
    catalog.git.map(async (entry) => {
      gitReleases.set(
        entry.id,
        await fetchGithubRelease(entry.repository, { token }),
      );
    }),
  );

  return { npmLatests, gitReleases };
}

function applyGitUpdates(catalog, report, gitReleases) {
  const updates = updatesInReport(report).filter((item) => item.source === SOURCE_GIT);
  if (updates.length === 0) {
    return false;
  }

  for (const item of updates) {
    const index = catalog.git.findIndex((entry) => entry.id === item.id);
    catalog.git[index] = nextGitPin(catalog.git[index], gitReleases.get(item.id));
  }

  writeCatalog(catalog);

  for (const item of updates) {
    const entry = catalog.git.find((candidate) => candidate.id === item.id);
    rmSync(path.join(APP_ROOT, entry.vendorDir), { recursive: true, force: true });
    execFileSync(process.execPath, [path.join(APP_ROOT, entry.copyScript)], {
      cwd: APP_ROOT,
      stdio: "inherit",
    });
  }

  return true;
}

function applyNpmUpdates(report) {
  const names = updatesInReport(report)
    .filter((item) => item.source === SOURCE_NPM)
    .map((item) => `${item.id}@${item.latest}`);

  if (names.length === 0) {
    return false;
  }

  execFileSync("npm", ["install", ...names], {
    cwd: APP_ROOT,
    stdio: "inherit",
  });
  return true;
}

function writeOutputFiles(report) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, formatGithubSummary(report));
  }

  const reportPath = process.env.RENDER_LIBS_REPORT;
  if (reportPath) {
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  const messagePath = process.env.RENDER_LIBS_COMMIT_MESSAGE;
  if (messagePath) {
    writeFileSync(messagePath, `${formatCommitMessage(report)}\n`);
  }

  const bodyPath = process.env.RENDER_LIBS_PR_BODY;
  if (bodyPath) {
    writeFileSync(bodyPath, formatPullRequestBody(report));
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== UPDATE_FLAG)) {
    fail(`неизвестный аргумент. Использование: node scripts/check-render-libraries.mjs [${UPDATE_FLAG}]`);
  }

  const update = args.includes(UPDATE_FLAG);
  const catalog = readCatalog();
  const packageJson = readJson(PACKAGE_JSON_PATH);
  const packageLock = readJson(PACKAGE_LOCK_PATH);

  for (const name of catalog.npm) {
    assertDeclared(packageJson, name);
  }

  const { npmLatests, gitReleases } = await loadLatest(catalog);
  const report = buildReport({ catalog, packageLock, npmLatests, gitReleases });
  console.log(formatReport(report));
  writeOutputFiles(report);

  const pending = updatesInReport(report);
  if (!update) {
    console.log(
      pending.length === 0
        ? "\nОбновлений нет."
        : `\nОбновлений: ${pending.length}. Для установки: node scripts/check-render-libraries.mjs ${UPDATE_FLAG}`,
    );
    return;
  }

  if (pending.length === 0) {
    console.log("\nОбновлять нечего.");
    return;
  }

  applyGitUpdates(catalog, report, gitReleases);
  applyNpmUpdates(report);
  console.log("\nВерсии обновлены в рабочем дереве.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
