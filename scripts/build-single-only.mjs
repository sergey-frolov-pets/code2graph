import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  appRoot,
  buildSingleHtmlDocument,
  copyPlantumlLib,
  ensureVendorFiles,
  readBuiltAssets,
} from "./lib/single-html-core.mjs";

const singleDir = path.join(appRoot, "dist-single");

function buildSingleHtmlOnly() {
  const { css, appJs, vizGlobalPayload, plantumlPayload } = readBuiltAssets();

  const html = buildSingleHtmlDocument({
    css,
    appJs,
    vizGlobalPayload,
    plantumlPayload,
  });

  rmSync(singleDir, { recursive: true, force: true });
  mkdirSync(singleDir, { recursive: true });
  writeFileSync(path.join(singleDir, "index.html"), html, "utf8");
  copyFileSync(
    path.join(appRoot, "public", "llm-api-keys.html"),
    path.join(singleDir, "llm-api-keys.html"),
  );
  copyPlantumlLib(singleDir);

  const outputSize = Buffer.byteLength(html, "utf8");
  console.log(
    `Built dist-single/index.html (${(outputSize / 1024 / 1024).toFixed(2)} MB) — один файл для хостинга`,
  );
}

ensureVendorFiles();
buildSingleHtmlOnly();
