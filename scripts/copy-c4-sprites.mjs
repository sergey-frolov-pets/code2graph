/**
 * Кладёт рисунки иконок C4 рядом с приложением: OpenIconic, спрайты Office
 * и наборы devicons / Font Awesome 5 из примеров C4-PlantUML.
 * Офлайн-рендер читает их с того же адреса, что и само приложение.
 */
import { execFileSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  C4_OFFLINE_SPRITE_LIBRARIES,
  OPENICONIC_BUNDLE_FILE,
  readStdlibSpriteFiles,
} from "./lib/plantuml-stdlib-sprites.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const plantUmlLibDir = path.join(appRoot, "public", "plantuml-lib");
const zipCacheDir = path.join(appRoot, "vendor", "js-plantuml");
const stampPath = path.join(plantUmlLibDir, ".c4-sprite-stamp");

const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_RETRY_MS = 2000;
const UNZIP_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

const REQUIRED_SPRITE_FILES = [
  "office/users/users.puml",
  "tupadr3/devicons/angular.puml",
  "tupadr3/font-awesome-5/server.puml",
  OPENICONIC_BUNDLE_FILE,
];

function readPlantUmlCoreVersion() {
  const installedPath = path.join(
    appRoot,
    "node_modules",
    "@plantuml",
    "core",
    "package.json",
  );
  if (existsSync(installedPath)) {
    return JSON.parse(readFileSync(installedPath, "utf8")).version;
  }

  const lockPath = path.join(appRoot, "package-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const locked = lock.packages?.["node_modules/@plantuml/core"]?.version;
  if (!locked) {
    throw new Error("Cannot resolve @plantuml/core version");
  }
  return locked;
}

function releaseZipUrl(version) {
  return `https://github.com/plantuml/plantuml/releases/download/v${version}/js-plantuml-${version}.zip`;
}

function stampContents(version) {
  const libraries = C4_OFFLINE_SPRITE_LIBRARIES.map((library) => {
    const groups = library.groups ? library.groups.join(",") : "*";
    return `${library.id}:${groups}`;
  }).join("\n");
  return `${version}\n${libraries}\n${OPENICONIC_BUNDLE_FILE}\n`;
}

function spritesAreCurrent(version) {
  if (!existsSync(stampPath)) {
    return false;
  }
  if (readFileSync(stampPath, "utf8") !== stampContents(version)) {
    return false;
  }
  return REQUIRED_SPRITE_FILES.every((relativePath) =>
    existsSync(path.join(plantUmlLibDir, relativePath)),
  );
}

function zipIsReadable(zipPath) {
  try {
    execFileSync("unzip", ["-t", zipPath], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function downloadZip(version) {
  mkdirSync(zipCacheDir, { recursive: true });
  const zipPath = path.join(zipCacheDir, `js-plantuml-${version}.zip`);
  if (existsSync(zipPath) && zipIsReadable(zipPath)) {
    return zipPath;
  }
  rmSync(zipPath, { force: true });

  const url = releaseZipUrl(version);
  let lastError = null;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      await pipeline(
        Readable.fromWeb(response.body),
        createWriteStream(zipPath),
      );
      if (!zipIsReadable(zipPath)) {
        throw new Error(`Downloaded archive is not a zip: ${url}`);
      }
      return zipPath;
    } catch (error) {
      lastError = error;
      rmSync(zipPath, { force: true });
      if (attempt < DOWNLOAD_ATTEMPTS) {
        await new Promise((resolve) => {
          setTimeout(resolve, DOWNLOAD_RETRY_MS * attempt);
        });
      }
    }
  }

  throw new Error(
    `Failed to download PlantUML sprite bundles: ${lastError?.message ?? lastError}`,
  );
}

function readZipEntry(zipPath, entryName) {
  return execFileSync("unzip", ["-p", zipPath, entryName], {
    maxBuffer: UNZIP_MAX_BUFFER_BYTES,
  });
}

function writeSpriteLibrary(libraryId, source) {
  const files = readStdlibSpriteFiles(source, libraryId);
  if (files.length === 0) {
    throw new Error(`No C4 sprites found in ${libraryId}`);
  }

  rmSync(path.join(plantUmlLibDir, libraryId), { recursive: true, force: true });

  for (const file of files) {
    const targetPath = path.join(plantUmlLibDir, file.relativePath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, file.contents, "utf8");
  }

  return files.length;
}

async function copyC4Sprites() {
  const version = readPlantUmlCoreVersion();
  if (spritesAreCurrent(version)) {
    console.log(`C4 icon sprites already match PlantUML ${version}`);
    return;
  }

  const zipPath = await downloadZip(version);
  mkdirSync(plantUmlLibDir, { recursive: true });

  const counts = [];
  for (const library of C4_OFFLINE_SPRITE_LIBRARIES) {
    const source = readZipEntry(zipPath, `${library.id}.min.js`).toString("utf8");
    const count = writeSpriteLibrary(library.id, source);
    counts.push(`${library.id}: ${count}`);
  }

  writeFileSync(
    path.join(plantUmlLibDir, OPENICONIC_BUNDLE_FILE),
    readZipEntry(zipPath, OPENICONIC_BUNDLE_FILE),
  );
  writeFileSync(stampPath, stampContents(version), "utf8");

  for (const relativePath of REQUIRED_SPRITE_FILES) {
    const targetPath = path.join(plantUmlLibDir, relativePath);
    if (!existsSync(targetPath)) {
      throw new Error(`C4 sprite was not written: ${relativePath}`);
    }
  }

  console.log(
    `Copied C4 icon sprites for PlantUML ${version} (${counts.join(", ")}, ${OPENICONIC_BUNDLE_FILE})`,
  );
}

await copyC4Sprites();
