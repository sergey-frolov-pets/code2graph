import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const targetDir = path.join(appRoot, "public", "plantuml-lib", "C4");
const c4SourceDir = path.join(appRoot, "vendor", "C4-PlantUML");

const C4_REPO = "https://github.com/plantuml-stdlib/C4-PlantUML.git";
const C4_TAG = "release/v2.13.0";

const C4_PUML_FILES = [
  "C4.puml",
  "C4_Context.puml",
  "C4_Container.puml",
  "C4_Component.puml",
  "C4_Deployment.puml",
  "C4_Dynamic.puml",
  "C4_Sequence.puml",
];

function patchConditionalIncludes(content) {
  return content.replace(
    /!if\s+%variable_exists\("RELATIVE_INCLUDE"\)\s*\n\s*!include\s+\.\/([^\n]+)\n!else\n\s*!include\s+https:\/\/[^\n]+\n!endif/g,
    "!include ./$1",
  );
}

function ensureC4Source() {
  if (existsSync(c4SourceDir)) {
    return;
  }

  mkdirSync(path.join(appRoot, "vendor"), { recursive: true });
  execSync(
    `git clone --depth 1 --branch ${C4_TAG} ${C4_REPO} ${c4SourceDir}`,
    { stdio: "inherit" },
  );
}

function copyC4Library() {
  ensureC4Source();
  mkdirSync(targetDir, { recursive: true });

  for (const fileName of C4_PUML_FILES) {
    const sourcePath = path.join(c4SourceDir, fileName);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing C4 source file: ${fileName}`);
    }

    const patched = patchConditionalIncludes(
      readFileSync(sourcePath, "utf8"),
    );
    writeFileSync(path.join(targetDir, fileName), patched, "utf8");
  }

  const themesSource = path.join(c4SourceDir, "themes");
  const themesTarget = path.join(targetDir, "themes");
  if (existsSync(themesSource)) {
    cpSync(themesSource, themesTarget, { recursive: true });
  }

  writeFileSync(
    path.join(targetDir, "README.md"),
    `# C4-PlantUML (local copy)

Version: v2.13.0 — https://github.com/plantuml-stdlib/C4-PlantUML

Usage in diagrams:

\`\`\`plantuml
!include ./plantuml-lib/C4/C4_Container.puml
\`\`\`

Files are patched for local \`!include ./...\` resolution (no network required).
`,
    "utf8",
  );

  console.log(`Copied C4-PlantUML library to public/plantuml-lib/C4/ (${C4_PUML_FILES.length} files)`);
}

copyC4Library();
