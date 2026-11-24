import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
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
  readViteIndexAssets,
  writePreparedVendorFiles,
} from "./lib/single-html-core.mjs";

function buildHostedPackage() {
  const viteHtmlPath = path.join(distDir, "index.html");
  const assets = readViteIndexAssets(readFileSync(viteHtmlPath, "utf8"));
  if (assets.modules.length === 0) {
    throw new Error("Vite did not emit a module entry in dist/index.html");
  }

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
    stylesheets: assets.stylesheets,
    modulePreloads: assets.modulePreloads,
    modules: assets.modules,
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
    `Built hosted dist/index.html (${(htmlBytes / 1024).toFixed(1)} KB shell; entry ${assets.modules[0]})`,
  );
}

ensureVendorFiles();
buildHostedPackage();
