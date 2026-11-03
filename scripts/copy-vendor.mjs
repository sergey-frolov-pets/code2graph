import path from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const vendorDir = path.join(appRoot, "public", "vendor");
const coreDir = path.join(appRoot, "node_modules", "@plantuml", "core");

mkdirSync(vendorDir, { recursive: true });

for (const fileName of ["viz-global.js", "plantuml.js"]) {
  copyFileSync(path.join(coreDir, fileName), path.join(vendorDir, fileName));
}

console.log("Copied @plantuml/core vendor assets to public/vendor/");
