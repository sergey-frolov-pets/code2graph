import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

console.log(`i18n keys OK: ${ruKeys.size} keys in ru/en parity`);
