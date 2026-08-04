import {
  copyFileSync,
  cpSync,
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
const singleDir = path.join(appRoot, "dist-single");
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
  const match = readdirSync(assetsDir).find((fileName) =>
    fileName.endsWith(extension),
  );

  if (!match) {
    return "";
  }

  return readFileSync(path.join(assetsDir, match), "utf8");
}

function buildSingleHtmlOnly() {
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

  const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="color-scheme" content="light dark" />
    <title>vuePlantUML</title>
    ${css ? `<style>\n${css}\n    </style>` : ""}
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

  rmSync(singleDir, { recursive: true, force: true });
  mkdirSync(singleDir, { recursive: true });
  writeFileSync(path.join(singleDir, "index.html"), html, "utf8");
  cpSync(
    path.join(appRoot, "public", "plantuml-lib"),
    path.join(singleDir, "plantuml-lib"),
    { recursive: true },
  );

  const outputSize = Buffer.byteLength(html, "utf8");
  console.log(
    `Built dist-single/index.html (${(outputSize / 1024 / 1024).toFixed(2)} MB) — один файл для хостинга`,
  );
}

mkdirSync(vendorDir, { recursive: true });
for (const fileName of ["viz-global.js", "plantuml.js"]) {
  copyFileSync(
    path.join(appRoot, "node_modules", "@plantuml", "core", fileName),
    path.join(vendorDir, fileName),
  );
}

buildSingleHtmlOnly();
