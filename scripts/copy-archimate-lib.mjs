import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const targetDir = path.join(appRoot, "public", "plantuml-lib", "archimate");
const archimateSourceDir = path.join(
  appRoot,
  "vendor",
  "Archimate-PlantUML",
  "dist",
  "plantuml-stdlib",
  "stdlib",
  "archimate",
);

const ARCHIMATE_REPO = "https://github.com/plantuml-stdlib/Archimate-PlantUML.git";
const ARCHIMATE_TAG = "v3.2.2";

const ARCHIMATE_PUML_FILES = [
  "Archimate.puml",
  "ArchimateSequenceDiagramSupport.puml",
  "ArchimateSprites.puml",
];

function patchArchimateForLocal(content) {
  return content.replace(
    "!global $ARCH_LOCAL ?= %false()",
    "!global $ARCH_LOCAL = %true()",
  );
}

function ensureArchimateSource() {
  const vendorDir = path.join(appRoot, "vendor", "Archimate-PlantUML");
  if (existsSync(vendorDir)) {
    return;
  }

  mkdirSync(path.join(appRoot, "vendor"), { recursive: true });
  execSync(
    `git clone --depth 1 --branch ${ARCHIMATE_TAG} ${ARCHIMATE_REPO} ${vendorDir}`,
    { stdio: "inherit" },
  );
}

function copyArchimateLibrary() {
  ensureArchimateSource();
  mkdirSync(targetDir, { recursive: true });

  for (const fileName of ARCHIMATE_PUML_FILES) {
    const sourcePath = path.join(archimateSourceDir, fileName);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing Archimate source file: ${fileName}`);
    }

    let content = readFileSync(sourcePath, "utf8");
    if (fileName === "Archimate.puml") {
      content = patchArchimateForLocal(content);
    }

    writeFileSync(path.join(targetDir, fileName), content, "utf8");
  }

  const themesSource = path.join(archimateSourceDir, "themes");
  const themesTarget = path.join(targetDir, "themes");
  if (existsSync(themesSource)) {
    cpSync(themesSource, themesTarget, { recursive: true });
  }

  writeFileSync(
    path.join(targetDir, "README.md"),
    `# Archimate-PlantUML (local copy)

Version: v3.2.2 — https://github.com/plantuml-stdlib/Archimate-PlantUML

Usage in diagrams:

\`\`\`plantuml
!include <archimate/Archimate>
\`\`\`

Resolved locally to \`./plantuml-lib/archimate/Archimate.puml\` (offline, no network).
`,
    "utf8",
  );

  console.log(
    `Copied Archimate-PlantUML library to public/plantuml-lib/archimate/ (${ARCHIMATE_PUML_FILES.length} files)`,
  );
}

copyArchimateLibrary();
