import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const iconsDir = path.join(appRoot, "public", "icons");
const svgPath = path.join(iconsDir, "icon.svg");

mkdirSync(iconsDir, { recursive: true });

const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(outputPath);
  console.log(`Generated ${outputPath}`);
}

await sharp(svg).resize(180, 180).png().toFile(path.join(iconsDir, "apple-touch-icon.png"));
console.log("Generated apple-touch-icon.png");
