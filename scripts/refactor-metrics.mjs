import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = ["src", "server/src"];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(fullPath, files);
    } else if (/\.(ts|vue)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const byLines = files
  .map((filePath) => ({
    filePath: path.relative(ROOT, filePath),
    lines: readFileSync(filePath, "utf8").split("\n").length,
  }))
  .sort((a, b) => b.lines - a.lines);

const godFiles = byLines.filter((entry) => entry.lines > 800);
const utilsLines = byLines
  .filter((entry) => entry.filePath.startsWith("src/utils/"))
  .reduce((sum, entry) => sum + entry.lines, 0);

console.log("Refactor metrics");
console.log("================");
console.log(`Files scanned: ${files.length}`);
console.log(`Max file: ${byLines[0]?.lines ?? 0} (${byLines[0]?.filePath ?? "n/a"})`);
console.log(`God files (>800 lines): ${godFiles.length}`);
for (const entry of godFiles.slice(0, 10)) {
  console.log(`  - ${entry.lines}\t${entry.filePath}`);
}
console.log(`src/utils/ total lines: ${utilsLines}`);
