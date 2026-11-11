// Generates the three landing GIFs and their poster frames.
// Frames are drawn as SVG, rasterised with sharp and encoded with gifenc,
// so the assets are reproducible without a browser recording session:
//   node scripts/record-landing-gifs.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import gifenc from "gifenc";

const { GIFEncoder, quantize, applyPalette } = gifenc;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "landing");
const WIDTH = 960;
const HEIGHT = 540;
const BG = "#0f172a";
const PANEL = "#1e293b";
const INK = "#e2e8f0";
const MUTED = "#94a3b8";
const ACCENT = "#38bdf8";
const GREEN = "#4ade80";

function esc(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function codePanel(lines, typed, badge) {
  const visible = lines.map((line, index) => {
    const text = index < typed.full ? line : index === typed.full ? line.slice(0, typed.chars) : "";
    return `<text x="36" y="${120 + index * 34}" fill="${index === 0 ? ACCENT : INK}">${esc(text)}</text>`;
  }).join("");
  const cursor = typed.done ? "" : `<rect x="${36 + typed.chars * 11.1}" y="${104 + typed.full * 34}" width="10" height="20" fill="${ACCENT}"/>`;
  return `<rect x="16" y="56" width="440" height="420" rx="14" fill="${PANEL}"/>
    <circle cx="42" cy="84" r="6" fill="#f87171"/><circle cx="64" cy="84" r="6" fill="#facc15"/><circle cx="86" cy="84" r="6" fill="#4ade80"/>
    <text x="330" y="90" fill="${MUTED}" font-size="15">${esc(badge)}</text>
    <g font-family="monospace" font-size="18">${visible}${cursor}</g>`;
}

function actor(x, label) {
  return `<rect x="${x - 52}" y="76" width="104" height="38" rx="8" fill="#f8fafc"/>
    <text x="${x}" y="100" text-anchor="middle" fill="#0f172a" font-size="17" font-family="sans-serif">${label}</text>
    <line x1="${x}" y1="114" x2="${x}" y2="430" stroke="${MUTED}" stroke-dasharray="5 5"/>`;
}

function arrow(x1, x2, y, label, stage, at) {
  if (stage < at) return "";
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${INK}" stroke-width="2" marker-end="url(#ah)"/>
    <text x="${(x1 + x2) / 2}" y="${y - 10}" text-anchor="middle" fill="${INK}" font-size="15" font-family="sans-serif">${label}</text>`;
}

function diagramPanel(stage, title = "Live preview") {
  return `<rect x="472" y="56" width="472" height="420" rx="14" fill="#f8fafc"/>
    <text x="496" y="90" fill="#64748b" font-size="15" font-family="sans-serif">${title}</text>
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker></defs>
    ${stage >= 1 ? actor(580, "User") + actor(716, "API") + actor(852, "DB") : ""}
    ${arrow(580, 716, 180, "Order", stage, 2)}
    ${arrow(716, 852, 250, "Save", stage, 3)}
    ${arrow(852, 716, 320, "OK", stage, 4)}
    ${arrow(716, 580, 390, "Receipt", stage, 5)}`;
}

function frame(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>${body}</svg>`;
}

const HERO_LINES = ["sequenceDiagram", "  User->>API: Order", "  API->>DB: Save", "  DB-->>API: OK", "  API-->>User: Receipt"];

function heroFrames() {
  const frames = [];
  const totalChars = HERO_LINES.join("").length;
  const steps = 14;
  for (let step = 0; step <= steps; step += 1) {
    const budget = Math.floor((totalChars * step) / steps);
    let used = 0;
    let full = 0;
    let chars = 0;
    for (const line of HERO_LINES) {
      if (used + line.length <= budget) { used += line.length; full += 1; } else { chars = Math.max(0, budget - used); break; }
    }
    const stage = Math.min(5, Math.floor((step / steps) * 6));
    frames.push({ svg: frame(codePanel(HERO_LINES, { full, chars, done: step === steps }, "Mermaid") + diagramPanel(stage)), delay: step === steps ? 1400 : 320 });
  }
  frames.push({ svg: frames[frames.length - 1].svg, delay: 200 });
  // Hold the finished frame, then loop.
  frames[frames.length - 2].delay = 1600;
  return frames.slice(0, -1);
}

const PUML = ["@startuml", "User -> API : Order", "API -> DB : Save", "DB --> API : OK", "API --> User : Receipt", "@enduml"];
const MERMAID = ["sequenceDiagram", "  User->>API: Order", "  API->>DB: Save", "  DB-->>API: OK", "  API-->>User: Receipt"];

function converterFrames() {
  const frames = [];
  for (let i = 0; i < 4; i += 1) frames.push({ svg: frame(codePanel(PUML, { full: PUML.length, chars: 0, done: true }, "PlantUML") + diagramPanel(5)), delay: 420 });
  frames.push({ svg: frame(codePanel(MERMAID, { full: 0, chars: 0, done: false }, "Convert → Mermaid") + diagramPanel(5)), delay: 500 });
  for (let full = 1; full <= MERMAID.length; full += 1) frames.push({ svg: frame(codePanel(MERMAID, { full, chars: 0, done: full === MERMAID.length }, "Mermaid") + diagramPanel(5)), delay: 260 });
  frames[frames.length - 1].delay = 1600;
  return frames;
}

function mcpFrames() {
  const frames = [];
  const prompt = "Draw the checkout flow";
  for (let step = 0; step <= 8; step += 1) {
    const typed = prompt.slice(0, Math.floor((prompt.length * step) / 8));
    const stage = step < 5 ? 0 : Math.min(5, step - 4);
    const chat = `<rect x="16" y="56" width="440" height="420" rx="14" fill="${PANEL}"/>
      <text x="36" y="100" fill="${MUTED}" font-size="15" font-family="sans-serif">Cursor · agent</text>
      <rect x="36" y="126" width="360" height="54" rx="12" fill="#334155"/>
      <text x="52" y="160" fill="${INK}" font-size="17" font-family="sans-serif">${esc(typed)}</text>
      ${stage >= 1 ? `<rect x="36" y="206" width="360" height="86" rx="12" fill="#14532d"/><text x="52" y="240" fill="${GREEN}" font-size="16" font-family="monospace">generate_diagram ✓</text><text x="52" y="268" fill="${INK}" font-size="14" font-family="monospace">source + image</text>` : ""}`;
    frames.push({ svg: frame(chat + diagramPanel(stage, "MCP result")), delay: step === 8 ? 1600 : 340 });
  }
  return frames;
}

async function encodeGif(frames, outPath, posterPath) {
  const gif = GIFEncoder();
  for (const { svg, delay } of frames) {
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const palette = quantize(data, 128);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, info.width, info.height, { palette, delay, repeat: 0 });
  }
  gif.finish();
  await writeFile(outPath, Buffer.from(gif.bytes()));
  const posterSvg = frames[frames.length - 1].svg;
  await writeFile(posterPath, await sharp(Buffer.from(posterSvg)).png().toBuffer());
}

await mkdir(outDir, { recursive: true });
await encodeGif(heroFrames(), path.join(outDir, "hero.gif"), path.join(outDir, "hero-poster.png"));
await encodeGif(converterFrames(), path.join(outDir, "converter.gif"), path.join(outDir, "converter-poster.png"));
await encodeGif(mcpFrames(), path.join(outDir, "mcp.gif"), path.join(outDir, "mcp-poster.png"));
await writeFile(path.join(root, "docs", "demo.gif"), await readFile(path.join(outDir, "hero.gif")));
console.log("landing GIFs written to public/landing/");
