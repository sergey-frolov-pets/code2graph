import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const distDir = path.join(appRoot, "dist");
const vendorDir = path.join(appRoot, "public", "vendor");

function escapeScriptContent(content) {
  return content.replace(/<\/script/gi, "<\\/script");
}

function preparePlantUmlEngine(source) {
  return source.replace(
    /export\s*\{\s*C\s+as\s+render\s*,\s*D\s+as\s+renderToString\s*\}\s*;?\s*$/,
    "window.PlantUML={render:C,renderToString:D};",
  );
}

function toGzipBase64(source) {
  return gzipSync(Buffer.from(source, "utf8")).toString("base64");
}

function readDistAsset(extension) {
  const assetsDir = path.join(distDir, "assets");
  if (!readdirSync(assetsDir).some((fileName) => fileName.endsWith(extension))) {
    return "";
  }

  const match = readdirSync(assetsDir).find((fileName) => fileName.endsWith(extension));

  if (!match) {
    return "";
  }

  return readFileSync(path.join(assetsDir, match), "utf8");
}

function buildSingleHtml() {
  const css = readDistAsset(".css");
  const appJs = readDistAsset(".js");
  const vizGlobalPayload = toGzipBase64(
    readFileSync(path.join(vendorDir, "viz-global.js"), "utf8"),
  );
  const plantumlPayload = toGzipBase64(
    preparePlantUmlEngine(
      readFileSync(path.join(vendorDir, "plantuml.js"), "utf8"),
    ),
  );
  const pwaBootstrap = readFileSync(
    path.join(appRoot, "public", "pwa-install-bootstrap.js"),
    "utf8",
  );

  const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="color-scheme" content="light dark" />
    <meta
      name="description"
      content="Оффлайн-редактор и генератор PlantUML диаграмм на Vue.js"
    />
    <title>vuePlantUML</title>
    <link rel="canonical" href="https://puml.sergey-frolov.ru/" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icons/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#42b883" />
    ${css ? `<style>\n${css}\n    </style>` : ""}
    <script>
${escapeScriptContent(pwaBootstrap)}
    </script>
  </head>
  <body>
    <div id="app">
      <div style="padding:20px;font-family:sans-serif;color:#1a1f24;background:#f4f6f8;min-height:100vh">
        <h1 style="margin:0 0 8px;font-size:20px">vuePlantUML</h1>
        <p style="margin:0;color:#5b6670">Загрузка интерфейса...</p>
      </div>
    </div>
    <script>
      window.addEventListener("error", function (event) {
        var root = document.getElementById("app");
        if (!root || root.querySelector(".app-shell")) {
          return;
        }
        var message = event.error ? String(event.error) : String(event.message || "unknown");
        root.innerHTML =
          '<pre style="padding:16px;color:#c4314b;white-space:pre-wrap;font:14px/1.4 monospace">Ошибка запуска: ' +
          message +
          "</pre>";
      });
    </script>
    <script type="application/json" id="vendor-viz-global">${vizGlobalPayload}</script>
    <script type="application/json" id="vendor-plantuml">${plantumlPayload}</script>
    <script>
${escapeScriptContent(appJs)}
    </script>
  </body>
</html>
`;

  writeFileSync(path.join(distDir, "index.html"), html, "utf8");

  copyFileSync(
    path.join(appRoot, "public", "manifest.webmanifest"),
    path.join(distDir, "manifest.webmanifest"),
  );
  copyFileSync(
    path.join(appRoot, "public", "sw.js"),
    path.join(distDir, "sw.js"),
  );
  copyFileSync(
    path.join(appRoot, "public", "pwa-install-bootstrap.js"),
    path.join(distDir, "pwa-install-bootstrap.js"),
  );
  copyFileSync(
    path.join(appRoot, "public", "install.html"),
    path.join(distDir, "install.html"),
  );
  copyFileSync(
    path.join(appRoot, "public", "start-termux.sh"),
    path.join(distDir, "start-termux.sh"),
  );
  const cnamePath = path.join(appRoot, "public", "CNAME");
  if (existsSync(cnamePath)) {
    copyFileSync(cnamePath, path.join(distDir, "CNAME"));
  }
  cpSync(path.join(appRoot, "public", "icons"), path.join(distDir, "icons"), {
    recursive: true,
  });

  const distFiles = readdirSync(distDir);
  console.log(`Dist package: ${distFiles.join(", ")}`);

  rmSync(path.join(distDir, "assets"), { recursive: true, force: true });
  rmSync(path.join(distDir, "vendor"), { recursive: true, force: true });

  const outputSize = Buffer.byteLength(html, "utf8");
  console.log(
    `Built single-file dist/index.html (${(outputSize / 1024 / 1024).toFixed(2)} MB, gzip payloads)`,
  );
}

mkdirSync(vendorDir, { recursive: true });
for (const fileName of ["viz-global.js", "plantuml.js"]) {
  copyFileSync(
    path.join(appRoot, "node_modules", "@plantuml", "core", fileName),
    path.join(vendorDir, fileName),
  );
}

buildSingleHtml();
