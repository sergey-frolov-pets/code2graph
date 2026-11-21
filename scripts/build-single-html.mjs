import {
  copyFileSync,
  existsSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  appRoot,
  buildHostedHtmlDocument,
  copyPlantumlLib,
  copyPwaDistAssets,
  distDir,
  ensureVendorFiles,
  findDistAssetFileName,
  readAppVersion,
  writePreparedVendorFiles,
} from "./lib/single-html-core.mjs";

function stabilizeAssetName(extension, stableName) {
  const current = findDistAssetFileName(extension);
  if (!current) {
    throw new Error(`Vite did not emit a ${extension} asset under dist/assets`);
  }
  const assetsDir = path.join(distDir, "assets");
  if (current === stableName) {
    return stableName;
  }
  renameSync(path.join(assetsDir, current), path.join(assetsDir, stableName));
  return stableName;
}

function buildHostedPackage() {
  const version = readAppVersion();
  const appJsName = stabilizeAssetName(".js", "app.js");
  const cssName = findDistAssetFileName(".css")
    ? stabilizeAssetName(".css", "app.css")
    : null;

  const headExtra = `
    <meta
      name="description"
      content="Оффлайн-редактор и генератор PlantUML диаграмм на Vue.js"
    />
    <link rel="canonical" href="https://code2graph.ru/" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icons/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#42b883" />`;

  const html = buildHostedHtmlDocument({
    cssHref: cssName ? `./assets/${cssName}?v=${version}` : "",
    appJsHref: `./assets/${appJsName}?v=${version}`,
    headExtra,
    includePwaBootstrap: true,
  });

  writeFileSync(path.join(distDir, "index.html"), html, "utf8");

  copyPwaDistAssets(distDir);
  writePreparedVendorFiles(distDir);
  copyPlantumlLib(distDir);

  const spaFallback = path.join(appRoot, "public", "404.html");
  if (existsSync(spaFallback)) {
    copyFileSync(spaFallback, path.join(distDir, "404.html"));
  }

  const distFiles = readdirSync(distDir);
  const htmlBytes = Buffer.byteLength(html, "utf8");
  console.log(`Dist package: ${distFiles.join(", ")}`);
  console.log(
    `Built hosted dist/index.html (${(htmlBytes / 1024).toFixed(1)} KB shell; app at assets/${appJsName})`,
  );
}

ensureVendorFiles();
buildHostedPackage();
