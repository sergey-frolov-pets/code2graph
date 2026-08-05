import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const messagesPath = path.join(root, "src/locales/messages.ts");
const source = readFileSync(messagesPath, "utf8");

function extractKeys(blockName) {
  const start = source.indexOf(`export const ${blockName}`);
  if (start < 0) {
    throw new Error(`Block ${blockName} not found in messages.ts`);
  }

  const openBrace = source.indexOf("{", start);
  let depth = 0;
  let end = openBrace;

  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  const block = source.slice(openBrace + 1, end);
  const keys = new Set();

  for (const match of block.matchAll(/^\s*"([^"]+)":/gm)) {
    keys.add(match[1]);
  }

  return keys;
}

const ruKeys = extractKeys("ruMessages");
const enKeys = extractKeys("enMessages");

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
