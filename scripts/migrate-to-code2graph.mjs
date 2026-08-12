/**
 * One-off migration: Code2Graph → Code2Graph branding and identifiers.
 * Run: node scripts/migrate-to-code2graph.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "dist-single",
  "dist-minimal",
  "release",
  "public/plantuml-lib",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "server/package-lock.json",
  "publish/index.html",
]);

/** Order matters: longer / specific patterns first. */
const REPLACEMENTS = [
  ["sergey-frolov-pets.github.io/code2graph", "sergey-frolov-pets.github.io/code2graph"],
  ["github.com/sergey-frolov-pets/code2graph", "github.com/sergey-frolov-pets/code2graph"],
  ["code2graph-library-api", "code2graph-library-api"],
  ["code2graph-dev-auth-secret-change-me", "code2graph-dev-auth-secret-change-me"],
  ["code2graph-library.json", "code2graph-library.json"],
  ["code2graph-library-api-v1", "code2graph-library-api-v1"],
  ["code2graph-precache-v1", "code2graph-precache-v1"],
  ["code2graph-shell-v1", "code2graph-shell-v1"],
  ["code2graph-library", "code2graph-library"],
  ["code2graph-versions", "code2graph-versions"],
  ["code2graph-ir", "code2graph-ir"],
  ["code2graph.html", "code2graph.html"],
  ["@code2graph/shared", "@code2graph/shared"],
  ["code2graph-app", "code2graph-app"],
  ["code2graph", "code2graph"],
  ["Code2Graph", "Code2Graph"],
  ["/opt/code2graph", "/opt/code2graph"],
  ["code2graph-library.service", "code2graph-library.service"],
  ["code2graph-library", "code2graph-library"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function shouldProcess(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (SKIP_FILES.has(rel)) return false;
  if (rel.includes("plantuml-lib/")) return false;
  const ext = path.extname(filePath).toLowerCase();
  const textExts = new Set([
    ".ts", ".tsx", ".js", ".mjs", ".vue", ".json", ".md", ".html",
    ".yml", ".yaml", ".toml", ".svg", ".webmanifest", ".example",
  ]);
  if (!textExts.has(ext) && !rel.endsWith("CNAME")) return false;
  return true;
}

function applyReplacements(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const changed = [];
for (const file of walk(ROOT)) {
  if (!shouldProcess(file)) continue;
  const before = readFileSync(file, "utf8");
  const after = applyReplacements(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed.push(path.relative(ROOT, file));
  }
}

console.log(`Updated ${changed.length} files:`);
for (const f of changed) console.log(`  ${f}`);
