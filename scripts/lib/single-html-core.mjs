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

export const LOADING_SHELL_INNER = `
      <div class="app-boot-loader" role="status" aria-live="polite" aria-label="Code2Graph">
        <style>
          .app-boot-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            min-height: 100dvh;
            padding: 24px;
            background: var(--bg, #f4f6f8);
            color: var(--accent, #0f6cbd);
          }
          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) .app-boot-loader {
              background: var(--bg, #0f1419);
              color: var(--accent, #4da3ff);
            }
          }
          .app-boot-loader__svg {
            width: 128px;
            height: 128px;
            overflow: visible;
          }
          .app-boot-loader__ring-track {
            fill: none;
            stroke: currentColor;
            stroke-opacity: 0.14;
            stroke-width: 3;
          }
          .app-boot-loader__ring-spin {
            fill: none;
            stroke: currentColor;
            stroke-width: 3.5;
            stroke-linecap: round;
            stroke-dasharray: 88 264;
            transform-origin: 64px 64px;
            animation: app-boot-ring-rotate 1.4s linear infinite;
          }
          .app-boot-loader__edge {
            fill: none;
            stroke: currentColor;
            stroke-opacity: 0.28;
            stroke-width: 2;
            stroke-linecap: round;
          }
          .app-boot-loader__arrow {
            fill: currentColor;
            fill-opacity: 0.35;
          }
          .app-boot-loader__edge-flow {
            fill: none;
            stroke: currentColor;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-dasharray: 14 40;
            opacity: 0;
          }
          .app-boot-loader__edge-flow--1 {
            animation: app-boot-edge-flow-1 2.4s ease-in-out infinite;
          }
          .app-boot-loader__edge-flow--2 {
            animation: app-boot-edge-flow-2 2.4s ease-in-out infinite;
          }
          .app-boot-loader__edge-flow--3 {
            animation: app-boot-edge-flow-3 2.4s ease-in-out infinite;
          }
          .app-boot-loader__node {
            fill: var(--surface, #ffffff);
            stroke: currentColor;
            stroke-width: 2.2;
            transform-box: fill-box;
            transform-origin: center;
          }
          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) .app-boot-loader__node {
              fill: var(--surface, #171d24);
            }
          }
          .app-boot-loader__node--1 {
            animation: app-boot-node-1 2.4s ease-in-out infinite;
          }
          .app-boot-loader__node--2 {
            animation: app-boot-node-2 2.4s ease-in-out infinite;
          }
          .app-boot-loader__node--3 {
            animation: app-boot-node-3 2.4s ease-in-out infinite;
          }
          .app-boot-loader__packet {
            fill: currentColor;
            animation: app-boot-packet 2.4s ease-in-out infinite;
          }
          @keyframes app-boot-ring-rotate {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes app-boot-node-1 {
            0%, 100% {
              stroke-width: 3;
              transform: scale(1.08);
            }
            30%, 85% {
              stroke-width: 2;
              transform: scale(1);
            }
          }
          @keyframes app-boot-node-2 {
            0%, 20%, 65%, 100% {
              stroke-width: 2;
              transform: scale(1);
            }
            33%, 50% {
              stroke-width: 3;
              transform: scale(1.08);
            }
          }
          @keyframes app-boot-node-3 {
            0%, 55%, 95%, 100% {
              stroke-width: 2;
              transform: scale(1);
            }
            66%, 83% {
              stroke-width: 3;
              transform: scale(1.08);
            }
          }
          @keyframes app-boot-edge-flow-1 {
            0%, 5% {
              opacity: 0;
              stroke-dashoffset: 24;
            }
            15%, 28% {
              opacity: 1;
            }
            35%, 100% {
              opacity: 0;
              stroke-dashoffset: 0;
            }
          }
          @keyframes app-boot-edge-flow-2 {
            0%, 38% {
              opacity: 0;
              stroke-dashoffset: 24;
            }
            48%, 61% {
              opacity: 1;
            }
            68%, 100% {
              opacity: 0;
              stroke-dashoffset: 0;
            }
          }
          @keyframes app-boot-edge-flow-3 {
            0%, 71% {
              opacity: 0;
              stroke-dashoffset: 24;
            }
            81%, 93% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              stroke-dashoffset: 0;
            }
          }
          @keyframes app-boot-packet {
            0%, 8% {
              transform: translate(64px, 34px) scale(1);
              opacity: 1;
            }
            30%, 41% {
              transform: translate(86px, 76px) scale(1);
              opacity: 1;
            }
            63%, 74% {
              transform: translate(42px, 76px) scale(1);
              opacity: 1;
            }
            95%, 100% {
              transform: translate(64px, 34px) scale(1);
              opacity: 1;
            }
          }
        </style>
        <svg class="app-boot-loader__svg" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle class="app-boot-loader__ring-track" cx="64" cy="64" r="56" />
          <circle class="app-boot-loader__ring-spin" cx="64" cy="64" r="56" />

          <path class="app-boot-loader__edge" d="M72 44 L82 64" />
          <polygon class="app-boot-loader__arrow" points="78,63 84,67 84,59" />
          <path class="app-boot-loader__edge-flow app-boot-loader__edge-flow--1" d="M72 44 L82 64" />

          <path class="app-boot-loader__edge" d="M72 78 L56 78" />
          <polygon class="app-boot-loader__arrow" points="58,74 52,78 58,82" />
          <path class="app-boot-loader__edge-flow app-boot-loader__edge-flow--2" d="M72 78 L56 78" />

          <path class="app-boot-loader__edge" d="M46 66 L56 46" />
          <polygon class="app-boot-loader__arrow" points="58,49 58,42 52,46" />
          <path class="app-boot-loader__edge-flow app-boot-loader__edge-flow--3" d="M46 66 L56 46" />

          <rect class="app-boot-loader__node app-boot-loader__node--1" x="50" y="24" width="28" height="20" rx="5" />
          <rect class="app-boot-loader__node app-boot-loader__node--2" x="72" y="66" width="28" height="20" rx="5" />
          <rect class="app-boot-loader__node app-boot-loader__node--3" x="28" y="66" width="28" height="20" rx="5" />

          <circle class="app-boot-loader__packet" cx="0" cy="0" r="3.5" />
        </svg>
      </div>`;

const LOADING_SHELL = `
    <div id="app">${LOADING_SHELL_INNER}
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
