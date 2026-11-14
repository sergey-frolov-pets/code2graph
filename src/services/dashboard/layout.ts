import type { DashboardZone } from "@/services/mermaid/ext/engines/dashboard";

function overlaps(a: DashboardZone, b: DashboardZone): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Первое свободное место, которое не наезжает на уже лежащие зоны. */
export function placeDashboardZone(zones: DashboardZone[], diagramId: string): DashboardZone {
  const sizes = [0.5, 0.34, 0.25];
  for (const size of sizes) {
    const step = size;
    for (let y = 0; y + size <= 1.0001; y += step) {
      for (let x = 0; x + size <= 1.0001; x += step) {
        const candidate: DashboardZone = {
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
          w: size,
          h: size,
          diagramId,
        };
        if (!zones.some((zone) => overlaps(zone, candidate))) return candidate;
      }
    }
  }
  return { x: 0, y: 0, w: 0.25, h: 0.25, diagramId };
}
