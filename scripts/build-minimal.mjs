import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  appRoot,
  buildSingleHtmlDocument,
  ensureVendorFiles,
  readBuiltAssets,
} from "./lib/single-html-core.mjs";

const minimalDir = path.join(appRoot, "dist-minimal");

const MINIMAL_FILES = ["index.html", "manifest.webmanifest", "sw.js"];

function buildMinimalPackage() {
  const { css, appJs, vizGlobalPayload, plantumlPayload } = readBuiltAssets();

  const headExtra = `<link rel="manifest" href="./manifest.webmanifest" />`;

  const html = buildSingleHtmlDocument({
    css,
    appJs,
    vizGlobalPayload,
    plantumlPayload,
    headExtra,
  });

  rmSync(minimalDir, { recursive: true, force: true });
  mkdirSync(minimalDir, { recursive: true });

  writeFileSync(path.join(minimalDir, "index.html"), html, "utf8");
  copyFileSync(
    path.join(appRoot, "public", "manifest.minimal.webmanifest"),
    path.join(minimalDir, "manifest.webmanifest"),
  );
  copyFileSync(path.join(appRoot, "public", "sw.js"), path.join(minimalDir, "sw.js"));

  const outputSize = Buffer.byteLength(html, "utf8");
  console.log(`Minimal package (${MINIMAL_FILES.join(", ")}):`);
  for (const fileName of MINIMAL_FILES) {
    const size = readFileSync(path.join(minimalDir, fileName)).byteLength;
    console.log(`  ${fileName} — ${(size / 1024).toFixed(1)} KB`);
  }
  console.log(
    `Built dist-minimal/ (${(outputSize / 1024 / 1024).toFixed(2)} MB index.html)`,
  );
}

ensureVendorFiles();
buildMinimalPackage();
