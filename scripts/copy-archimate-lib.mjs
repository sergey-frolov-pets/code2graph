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

const ARCHIMATE_LOCAL_INCLUDE_PATTERN =
  /!if \(\$ARCH_LOCAL == %true\(\)\)\s*\r?\n\s*(!include [^\r\n]+)\s*\r?\n\s*!else\s*\r?\n\s*!include <archimate\/[^>]+>\s*\r?\n\s*!endif/g;

function patchArchimateForLocal(content) {
  let patched = content.replace(
    "!global $ARCH_LOCAL ?= %false()",
    "!global $ARCH_LOCAL = %true()",
  );

  patched = patched.replace(ARCHIMATE_LOCAL_INCLUDE_PATTERN, "$1");

  patched = patched.replace(
    [
      "!global $ARCH_LOCAL = %true()",
      "!global $ARCH_SEQUENCE_SUPPORT ?= %false()",
      "",
      "!if ($ARCH_LOCAL == %true())",
      "    !include themes/shared_style.puml",
      "    !if ($ARCH_SEQUENCE_SUPPORT == %true())",
      "        !include ArchimateSequenceDiagramSupport.puml",
      "    !endif",
      "!else",
      "    !include <archimate/themes/shared_style>",
      "    !if ($ARCH_SEQUENCE_SUPPORT == %true())",
      "        !include <archimate/ArchimateSequenceDiagramSupport>",
      "    !endif",
      "!endif",
    ].join("\n"),
    [
      "!global $ARCH_SEQUENCE_SUPPORT ?= %false()",
      "",
      "!include themes/shared_style.puml",
      "!if ($ARCH_SEQUENCE_SUPPORT == %true())",
      "    !include ArchimateSequenceDiagramSupport.puml",
      "!endif",
    ].join("\n"),
  );

  return patched;
}

function patchArchimateSequenceSupportForLocal(content) {
  return content.replace(
    [
      "!global $ARCH_LOCAL ?= %false()",
      "",
      "!if ($ARCH_LOCAL == %true())",
      "    !include themes/shared_style.puml",
      "!else",
      "    !include <archimate/themes/shared_style>",
      "!endif",
    ].join("\n"),
    "!include themes/shared_style.puml",
  );
}

function patchArchimateThemeForLocal(content) {
  return content.replace(ARCHIMATE_LOCAL_INCLUDE_PATTERN, "!include shared_style.puml");
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
    } else if (fileName === "ArchimateSequenceDiagramSupport.puml") {
      content = patchArchimateSequenceSupportForLocal(content);
    }

    writeFileSync(path.join(targetDir, fileName), content, "utf8");
  }

  const themesSource = path.join(archimateSourceDir, "themes");
  const themesTarget = path.join(targetDir, "themes");
  if (existsSync(themesSource)) {
    cpSync(themesSource, themesTarget, { recursive: true });
    for (const themeFileName of [
      "puml-theme-archimate-standard.puml",
      "puml-theme-archimate-saturated.puml",
      "puml-theme-archimate-alternate.puml",
      "puml-theme-archimate-lowsaturation.puml",
      "puml-theme-archimate-handwriting.puml",
    ]) {
      const themePath = path.join(themesTarget, themeFileName);
      if (existsSync(themePath)) {
        const themeContent = patchArchimateThemeForLocal(
          readFileSync(themePath, "utf8"),
        );
        writeFileSync(themePath, themeContent, "utf8");
      }
    }
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
