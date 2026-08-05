import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  appRoot,
  buildSingleHtmlDocument,
  cleanupDistAssets,
  copyPlantumlLib,
  copyPwaDistAssets,
  distDir,
  ensureVendorFiles,
  readBuiltAssets,
} from "./lib/single-html-core.mjs";

function buildSingleHtml() {
  const { css, appJs, vizGlobalPayload, plantumlPayload } = readBuiltAssets();

  const headExtra = `
    <meta
      name="description"
      content="Оффлайн-редактор и генератор PlantUML диаграмм на Vue.js"
    />
    <link rel="canonical" href="https://puml.sergey-frolov.ru/" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icons/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#42b883" />`;

  const html = buildSingleHtmlDocument({
    css,
    appJs,
    vizGlobalPayload,
    plantumlPayload,
    headExtra,
    includePwaBootstrap: true,
  });

  writeFileSync(path.join(distDir, "index.html"), html, "utf8");

  copyPwaDistAssets(distDir);
  copyPlantumlLib(distDir);

  const distFiles = readdirSync(distDir);
  console.log(`Dist package: ${distFiles.join(", ")}`);

  cleanupDistAssets();

  const outputSize = Buffer.byteLength(html, "utf8");
  console.log(
    `Built single-file dist/index.html (${(outputSize / 1024 / 1024).toFixed(2)} MB, gzip payloads)`,
  );
}

ensureVendorFiles();
buildSingleHtml();
