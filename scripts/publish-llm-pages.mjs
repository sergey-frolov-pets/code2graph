import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = join(root, "src/services/llm/guides/pages");
const catalog = JSON.parse(
  readFileSync(join(root, "packages/shared/src/llm-page-catalog.json"), "utf8"),
);
const destination = join(root, "public/llm");
const LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;

const published = catalog.map((page) => {
  const body = readFileSync(join(pagesDir, page.path), "utf8");
  const links = [];
  for (const match of body.matchAll(LINK_PATTERN)) {
    const target = match[1].trim();
    if (!target.startsWith("http:") && !target.startsWith("https:")) {
      links.push(target);
    }
  }
  return {
    id: page.id,
    path: page.path,
    parent: page.parent,
    keywords: page.keywords,
    links,
  };
});

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(pagesDir, destination, { recursive: true });
writeFileSync(join(destination, "pages.json"), `${JSON.stringify(published, null, 2)}\n`);
