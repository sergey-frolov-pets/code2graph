import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const singleDir = path.join(appRoot, "dist-single");
const releaseDir = path.join(appRoot, "release");
const publicDir = path.join(appRoot, "public");

function packageRelease() {
  const singleHtml = path.join(singleDir, "index.html");
  if (!existsSync(singleHtml)) {
    console.error("dist-single/index.html not found. Run: npm run build:single");
    process.exit(1);
  }

  rmSync(releaseDir, { recursive: true, force: true });
  mkdirSync(releaseDir, { recursive: true });

  copyFileSync(singleHtml, path.join(releaseDir, "vueplantuml.html"));
  copyFileSync(
    path.join(publicDir, "llm-api-keys.html"),
    path.join(releaseDir, "llm-api-keys.html"),
  );
  copyFileSync(
    path.join(publicDir, "llm-api-keys.en.html"),
    path.join(releaseDir, "llm-api-keys.en.html"),
  );
  cpSync(path.join(singleDir, "plantuml-lib"), path.join(releaseDir, "plantuml-lib"), {
    recursive: true,
  });
  copyFileSync(
    path.join(appRoot, "publish", "README.md"),
    path.join(releaseDir, "README.md"),
  );

  console.log(
    "Release package: release/vueplantuml.html, llm-api-keys.html, llm-api-keys.en.html, plantuml-lib/, README.md",
  );
}

packageRelease();
