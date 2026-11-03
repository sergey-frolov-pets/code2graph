import { readFileSync } from "node:fs";

const svg = readFileSync("sandbox/golden/08-waterfall-features.svg", "utf8");
console.log("size:", /viewBox="([^"]+)"/.exec(svg)?.[1]);
console.log("\n--- ticks (axis labels) ---");
for (const m of svg.matchAll(/<text x="56" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)) {
  console.log(`  y=${m[1]}  ${m[2]}`);
}
console.log("\n--- connectors ---");
for (const m of svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/g)) {
  console.log(`  (${m[1]},${m[2]}) -> (${m[3]},${m[4]})`);
}
console.log("\n--- break lines ---");
for (const m of svg.matchAll(/<line x1="64" y1="([\d.]+)" x2="[\d.]+" y2="[\d.]+"[^>]*stroke-dasharray="6 4"/g)) {
  console.log(`  y=${m[1]}`);
}
console.log("\n--- bars ---");
for (const m of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="(#[0-9a-f]+)"/g)) {
  console.log(`  x=${m[1]} y=${m[2]} h=${m[4]} ${m[5]}`);
}
console.log("\n--- value labels (font-size 10) ---");
for (const m of svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*font-size="10"[^>]*>([^<]+)<\/text>/g)) {
  console.log(`  (${m[1]},${m[2]}) "${m[3]}"`);
}
console.log("\n--- column labels ---");
for (const m of svg.matchAll(/<text x="([\d.]+)" y="322"[^>]*>([^<]+)<\/text>/g)) {
  console.log(`  x=${m[1]} "${m[2]}"`);
}
