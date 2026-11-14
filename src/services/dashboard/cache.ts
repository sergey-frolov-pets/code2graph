export interface DashboardSvgCacheEntry {
  svg: string;
  at: number;
}

const PREFIX = "code2graph-dashboard-svg:";

export function readDashboardSvgCache(diagramId: string): DashboardSvgCacheEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + diagramId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardSvgCacheEntry;
    if (!parsed || typeof parsed.svg !== "string" || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardSvgCache(diagramId: string, svg: string, at = Date.now()): void {
  try {
    localStorage.setItem(PREFIX + diagramId, JSON.stringify({ svg, at }));
  } catch {
    // The picture still shows if the browser refuses storage.
  }
}

/** Кэш ещё действует, пока заданный период не прошёл. Без периода кэш не подменяет чтение. */
export function dashboardCacheFresh(
  entry: DashboardSvgCacheEntry | null,
  refreshMs: number | null,
  now = Date.now(),
): boolean {
  if (!entry || refreshMs === null || refreshMs <= 0) return false;
  return now - entry.at < refreshMs;
}
