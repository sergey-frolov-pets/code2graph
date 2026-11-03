import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");

function extractKeysFromFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const keys = new Set();

  for (const match of source.matchAll(/^\s*"([^"]+)":/gm)) {
    keys.add(match[1]);
  }

  return keys;
}

function loadLocaleKeys(locale) {
  const indexPath = path.join(root, "src/locales", locale, "index.ts");
  const indexSource = readFileSync(indexPath, "utf8");
  const keys = new Set();

  for (const match of indexSource.matchAll(/from\s+"\.\/([^"]+)"/g)) {
    const domainFile = path.join(root, "src/locales", locale, `${match[1]}.ts`);
    for (const key of extractKeysFromFile(domainFile)) {
      keys.add(key);
    }
  }

  return keys;
}

function collectSourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "locales") {
        continue;
      }
      collectSourceFiles(fullPath, files);
      continue;
    }

    if (/\.(ts|vue)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectUsedKeys(filePath) {
  const source = readFileSync(filePath, "utf8");
  const keys = new Set();
  const relativePath = path.relative(root, filePath);

  const patterns = [
    /\bt\(\s*['"]([^'"]+)['"]/g,
    /\btranslateForLocale\(\s*[^,]+,\s*['"]([^'"]+)['"]/g,
    /detailKey:\s*['"]([^'"]+)['"]/g,
    /['"]([a-z][a-z0-9]*(?:\.[a-zA-Z0-9]+)+)['"]\s*,?\s*\/\/\s*i18n\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      keys.add({ key: match[1], file: relativePath });
    }
  }

  for (const match of source.matchAll(/\bt\(\s*`([^`$]+)`/g)) {
    keys.add({ key: match[1], file: relativePath });
  }

  return [...keys];
}

const ruKeys = loadLocaleKeys("ru");
const enKeys = loadLocaleKeys("en");

const onlyRu = [...ruKeys].filter((key) => !enKeys.has(key)).sort();
const onlyEn = [...enKeys].filter((key) => !ruKeys.has(key)).sort();

if (onlyRu.length > 0 || onlyEn.length > 0) {
  console.error("i18n key mismatch between ru and en:");
  if (onlyRu.length > 0) {
    console.error(`  only in ru (${onlyRu.length}):`, onlyRu.join(", "));
  }
  if (onlyEn.length > 0) {
    console.error(`  only in en (${onlyEn.length}):`, onlyEn.join(", "));
  }
  process.exit(1);
}

const localeKeys = enKeys;
const usedKeys = collectSourceFiles(srcRoot).flatMap(collectUsedKeys);
const missing = [];
const seen = new Set();

for (const entry of usedKeys) {
  const dedupeId = `${entry.file}:${entry.key}`;
  if (seen.has(dedupeId)) {
    continue;
  }
  seen.add(dedupeId);

  if (!localeKeys.has(entry.key) && !entry.key.endsWith(".")) {
    missing.push(entry);
  }
}

if (missing.length > 0) {
  console.error(`Missing i18n keys referenced in source (${missing.length}):`);
  for (const entry of missing.sort((a, b) => a.key.localeCompare(b.key))) {
    console.error(`  ${entry.key} (${entry.file})`);
  }
  process.exit(1);
}

console.log(
  `i18n keys OK: ${localeKeys.size} keys in ru/en parity, ${seen.size} static references validated`,
);
