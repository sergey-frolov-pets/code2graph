import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const APP_ROOT = path.resolve(scriptDir, "..");
export const CATALOG_PATH = path.join(scriptDir, "render-libraries.json");
export const PACKAGE_JSON_PATH = path.join(APP_ROOT, "package.json");
export const PACKAGE_LOCK_PATH = path.join(APP_ROOT, "package-lock.json");

export const C4_LIBRARY_ID = "c4";
export const ARCHIMATE_LIBRARY_ID = "archimate";

export const SOURCE_NPM = "npm";
export const SOURCE_GIT = "git";

export const GIT_REF_RELEASE_BRANCH = "release-branch";
export const GIT_REF_TAG = "tag";

export const STATUS_UP_TO_DATE = "up-to-date";
export const STATUS_UPDATE = "update";
export const STATUS_MISSING = "missing";
export const STATUS_AHEAD = "ahead";

const RELEASE_BRANCH_PREFIX = "release/";
const VERSION_PREFIX = /^v/i;
const NPM_REGISTRY = "https://registry.npmjs.org";
const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "code2graph-render-libraries";

const STATUS_LABEL = {
  [STATUS_UP_TO_DATE]: "актуально",
  [STATUS_UPDATE]: "есть обновление",
  [STATUS_MISSING]: "не установлена",
  [STATUS_AHEAD]: "новее реестра",
};

const GIT_REF_KINDS = new Set([GIT_REF_RELEASE_BRANCH, GIT_REF_TAG]);

export function libraryVersionLabel(version) {
  return VERSION_PREFIX.test(version) ? version : `v${version}`;
}

export function readCatalog(catalogPath = CATALOG_PATH) {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  validateCatalog(catalog);
  return catalog;
}

export function writeCatalog(catalog, catalogPath = CATALOG_PATH) {
  validateCatalog(catalog);
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

export function validateCatalog(catalog) {
  if (!Array.isArray(catalog?.npm) || catalog.npm.length === 0) {
    throw new Error("render-libraries.json: npm должен быть непустым списком пакетов");
  }

  for (const name of catalog.npm) {
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("render-libraries.json: имя npm-пакета пустое");
    }
  }

  if (!Array.isArray(catalog?.git) || catalog.git.length === 0) {
    throw new Error("render-libraries.json: git должен быть непустым списком библиотек");
  }

  for (const entry of catalog.git) {
    for (const field of ["id", "title", "repository", "cloneUrl", "ref", "version", "vendorDir", "copyScript"]) {
      if (typeof entry?.[field] !== "string" || entry[field].length === 0) {
        throw new Error(`render-libraries.json: у git-библиотеки нет поля ${field}`);
      }
    }

    if (!GIT_REF_KINDS.has(entry.refKind)) {
      throw new Error(
        `${entry.title}: refKind должен быть ${GIT_REF_RELEASE_BRANCH} или ${GIT_REF_TAG}`,
      );
    }

    assertRelativeRepoPath(entry.vendorDir, entry.title);
    assertRelativeRepoPath(entry.copyScript, entry.title);
  }
}

export function gitLibrary(catalog, id) {
  const entry = catalog.git.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`render-libraries.json: нет git-библиотеки ${id}`);
  }
  return entry;
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.parts.length, b.parts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (a.parts[index] ?? 0) - (b.parts[index] ?? 0);
    if (diff !== 0) {
      return diff < 0 ? -1 : 1;
    }
  }

  if (a.pre === b.pre) {
    return 0;
  }
  if (a.pre === null) {
    return 1;
  }
  if (b.pre === null) {
    return -1;
  }
  if (a.pre < b.pre) {
    return -1;
  }
  if (a.pre > b.pre) {
    return 1;
  }
  return 0;
}

export function installedNpmVersion(packageLock, name) {
  const installed = packageLock?.packages?.[`node_modules/${name}`]?.version;
  return typeof installed === "string" ? installed : null;
}

export function nextGitPin(entry, release) {
  const tagName = release?.tag_name;
  if (typeof tagName !== "string" || tagName.length === 0) {
    throw new Error(`${entry.title}: у релиза нет tag_name`);
  }

  const version = tagName.replace(VERSION_PREFIX, "");
  if (entry.refKind === GIT_REF_RELEASE_BRANCH) {
    const branch = release.target_commitish;
    if (typeof branch !== "string" || !branch.startsWith(RELEASE_BRANCH_PREFIX)) {
      throw new Error(
        `${entry.title}: ожидалась ветка ${RELEASE_BRANCH_PREFIX}*, получено ${branch ?? "пусто"}`,
      );
    }
    return { ...entry, ref: branch, version };
  }

  return { ...entry, ref: tagName, version };
}

export function versionStatus(current, latest) {
  if (current === null) {
    return STATUS_MISSING;
  }
  const order = compareVersions(current, latest);
  if (order < 0) {
    return STATUS_UPDATE;
  }
  if (order > 0) {
    return STATUS_AHEAD;
  }
  return STATUS_UP_TO_DATE;
}

export function buildReport({ catalog, packageLock, npmLatests, gitReleases }) {
  const npmItems = catalog.npm.map((name) => {
    const latest = npmLatests.get(name);
    const current = installedNpmVersion(packageLock, name);
    return {
      source: SOURCE_NPM,
      id: name,
      title: name,
      current,
      latest,
      status: versionStatus(current, latest),
      url: `https://www.npmjs.com/package/${name}`,
    };
  });

  const gitItems = catalog.git.map((entry) => {
    const release = gitReleases.get(entry.id);
    const latest = release.tag_name.replace(VERSION_PREFIX, "");
    return {
      source: SOURCE_GIT,
      id: entry.id,
      title: entry.title,
      current: entry.version,
      latest,
      status: versionStatus(entry.version, latest),
      url: release.html_url ?? `https://github.com/${entry.repository}/releases/tag/${release.tag_name}`,
    };
  });

  return { items: [...npmItems, ...gitItems] };
}

export function updatesInReport(report) {
  return report.items.filter(
    (item) => item.status === STATUS_UPDATE || item.status === STATUS_MISSING,
  );
}

export function formatReport(report) {
  const lines = ["Библиотеки рендеринга диаграмм", ""];
  for (const source of [SOURCE_NPM, SOURCE_GIT]) {
    const items = report.items.filter((item) => item.source === source);
    if (items.length === 0) {
      continue;
    }
    lines.push(source);
    for (const item of items) {
      const current = item.current ?? "—";
      lines.push(
        `  ${item.title}  ${current}  ${item.latest}  ${STATUS_LABEL[item.status]}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function formatGithubSummary(report) {
  const rows = report.items
    .map((item) => {
      const current = item.current ?? "—";
      return `| ${item.title} | ${current} | ${item.latest} | ${STATUS_LABEL[item.status]} |`;
    })
    .join("\n");

  return [
    "### Библиотеки рендеринга диаграмм",
    "",
    "| Библиотека | Сейчас | Последняя | Статус |",
    "| --- | --- | --- | --- |",
    rows,
    "",
  ].join("\n");
}

export function formatCommitMessage(report) {
  const lines = updatesInReport(report).map(
    (item) => `${item.title} ${item.current ?? "нет"} -> ${item.latest}`,
  );
  return ["chore: update diagram render libraries", "", ...lines].join("\n");
}

export function formatPullRequestBody(report) {
  const rows = updatesInReport(report)
    .map((item) => `| ${item.title} | ${item.current ?? "нет"} | ${item.latest} |`)
    .join("\n");

  return [
    "Запрос администратора: обновить библиотеки рендеринга диаграмм до последних стабильных версий.",
    "",
    "| Библиотека | Сейчас | Последняя |",
    "| --- | --- | --- |",
    rows,
    "",
    "Ветка пересобирается из `main` при каждом запуске с обновлением.",
    "",
  ].join("\n");
}

export function npmLatestUrl(name) {
  return `${NPM_REGISTRY}/${name.replace("/", "%2f")}/latest`;
}

export function githubLatestReleaseUrl(repository) {
  return `${GITHUB_API}/repos/${repository}/releases/latest`;
}

export async function fetchNpmLatest(name, options = {}) {
  const payload = await fetchJson(npmLatestUrl(name), options);
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    throw new Error(`${name}: в ответе npm нет version`);
  }
  return payload.version;
}

export async function fetchGithubRelease(repository, options = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  return fetchJson(githubLatestReleaseUrl(repository), { ...options, headers });
}

function parseVersion(value) {
  const raw = String(value).trim().replace(VERSION_PREFIX, "");
  const [main, pre = null] = raw.split("-", 2);
  const parts = main.split(".").map((part) => {
    if (!/^\d+$/.test(part)) {
      throw new Error(`Некорректная версия: ${value}`);
    }
    return Number(part);
  });

  if (parts.length === 0) {
    throw new Error(`Некорректная версия: ${value}`);
  }

  return { parts, pre };
}

function assertRelativeRepoPath(value, title) {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (
    path.isAbsolute(value)
    || normalized.startsWith("../")
    || normalized === ".."
    || normalized.startsWith("/")
  ) {
    throw new Error(`${title}: небезопасный путь ${value}`);
  }
}

async function fetchJson(url, options) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = {
    "User-Agent": USER_AGENT,
    ...options.headers,
  };
  const response = await fetchImpl(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${url} ответил ${response.status}`);
  }

  return response.json();
}
