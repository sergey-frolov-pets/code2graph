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

export type DashboardArrange = "columns" | "rows" | "grid";

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function fractionSpan(index: number, count: number): { start: number; size: number } {
  const start = round4(index / count);
  const end = round4((index + 1) / count);
  return { start, size: round4(end - start) };
}

/** Раскладывает выбранные диаграммы по колонкам, строкам или сетке. */
export function arrangeDashboardZones(
  ids: readonly string[],
  preset: DashboardArrange,
): DashboardZone[] {
  const unique: string[] = [];
  for (const id of ids) {
    if (!unique.includes(id)) unique.push(id);
  }
  const count = unique.length;
  if (count === 0) return [];

  if (preset === "columns" || preset === "rows") {
    return unique.map((diagramId, index) => {
      const span = fractionSpan(index, count);
      return preset === "columns"
        ? { x: span.start, y: 0, w: span.size, h: 1, diagramId }
        : { x: 0, y: span.start, w: 1, h: span.size, diagramId };
    });
  }

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return unique.map((diagramId, index) => {
    const col = fractionSpan(index % cols, cols);
    const row = fractionSpan(Math.floor(index / cols), rows);
    return { x: col.start, y: row.start, w: col.size, h: row.size, diagramId };
  });
}
