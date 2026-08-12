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
export const appRoot = path.resolve(scriptDir, "..", "..");
export const distDir = path.join(appRoot, "dist");
export const vendorDir = path.join(appRoot, "public", "vendor");

export function escapeScriptContent(content) {
  return content.replace(/<\/script/gi, "<\\/script");
}

export function preparePlantUmlEngine(source) {
  return source.replace(
    /export\s*\{\s*C\s+as\s+render\s*,\s*D\s+as\s+renderToString\s*\}\s*;?\s*$/,
    "window.PlantUML={render:C,renderToString:D};",
  );
}

export function toGzipBase64(source) {
  return gzipSync(Buffer.from(source, "utf8")).toString("base64");
}

export function readDistAsset(extension) {
  const assetsDir = path.join(distDir, "assets");
  if (!existsSync(assetsDir)) {
    return "";
  }

  const match = readdirSync(assetsDir).find((fileName) =>
    fileName.endsWith(extension),
  );

  if (!match) {
    return "";
  }

  return readFileSync(path.join(assetsDir, match), "utf8");
}

export function ensureVendorFiles() {
  mkdirSync(vendorDir, { recursive: true });
  for (const fileName of ["viz-global.js", "plantuml.js"]) {
    copyFileSync(
      path.join(appRoot, "node_modules", "@plantuml", "core", fileName),
      path.join(vendorDir, fileName),
    );
  }
}

export function readVendorPayloads() {
  const vizGlobalPayload = toGzipBase64(
    readFileSync(path.join(vendorDir, "viz-global.js"), "utf8"),
  );
  const plantumlPayload = toGzipBase64(
    preparePlantUmlEngine(
      readFileSync(path.join(vendorDir, "plantuml.js"), "utf8"),
    ),
  );
  return { vizGlobalPayload, plantumlPayload };
}

const ERROR_HANDLER_SCRIPT = `
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
      });`;

const LOADING_SHELL = `
    <div id="app">
      <div style="padding:20px;font-family:sans-serif;color:#1a1f24;background:#f4f6f8;min-height:100vh">
        <h1 style="margin:0 0 8px;font-size:20px">Code2Graph</h1>
        <p style="margin:0;color:#5b6670">Загрузка интерфейса...</p>
      </div>
    </div>`;

export function buildSingleHtmlDocument({
  css,
  appJs,
  vizGlobalPayload,
  plantumlPayload,
  headExtra = "",
  includePwaBootstrap = false,
}) {
  const pwaBootstrap = includePwaBootstrap
    ? readFileSync(
        path.join(appRoot, "public", "pwa-install-bootstrap.js"),
        "utf8",
      )
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta name="color-scheme" content="light dark" />
    <title>Code2Graph</title>
    ${headExtra}
    ${css ? `<style>\n${css}\n    </style>` : ""}
    ${includePwaBootstrap ? `<script>\n${escapeScriptContent(pwaBootstrap)}\n    </script>` : ""}
  </head>
  <body>
${LOADING_SHELL}
    <script>
${ERROR_HANDLER_SCRIPT}
    </script>
    <script type="application/json" id="vendor-viz-global">${vizGlobalPayload}</script>
    <script type="application/json" id="vendor-plantuml">${plantumlPayload}</script>
    <script>
${escapeScriptContent(appJs)}
    </script>
  </body>
</html>
`;
}

export function readBuiltAssets() {
  const css = readDistAsset(".css");
  const appJs = readDistAsset(".js");
  const { vizGlobalPayload, plantumlPayload } = readVendorPayloads();
  return { css, appJs, vizGlobalPayload, plantumlPayload };
}

export function copyPwaDistAssets(targetDir = distDir) {
  copyFileSync(
    path.join(appRoot, "public", "manifest.webmanifest"),
    path.join(targetDir, "manifest.webmanifest"),
  );
  copyFileSync(path.join(appRoot, "public", "sw.js"), path.join(targetDir, "sw.js"));
  copyFileSync(
    path.join(appRoot, "public", "pwa-install-bootstrap.js"),
    path.join(targetDir, "pwa-install-bootstrap.js"),
  );
  copyFileSync(
    path.join(appRoot, "public", "llm-api-keys.html"),
    path.join(targetDir, "llm-api-keys.html"),
  );
  copyFileSync(
    path.join(appRoot, "public", "llm-api-keys.en.html"),
    path.join(targetDir, "llm-api-keys.en.html"),
  );
  const cnamePath = path.join(appRoot, "public", "CNAME");
  if (existsSync(cnamePath)) {
    copyFileSync(cnamePath, path.join(targetDir, "CNAME"));
  }
  cpSync(path.join(appRoot, "public", "icons"), path.join(targetDir, "icons"), {
    recursive: true,
  });
}

export function copyPlantumlLib(targetDir) {
  cpSync(
    path.join(appRoot, "public", "plantuml-lib"),
    path.join(targetDir, "plantuml-lib"),
    { recursive: true },
  );
}

export function cleanupDistAssets() {
  rmSync(path.join(distDir, "assets"), { recursive: true, force: true });
  rmSync(path.join(distDir, "vendor"), { recursive: true, force: true });
}
