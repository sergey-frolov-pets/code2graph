import { detectType } from "./registry";
import type { ExtDiagramType, ExtEngine, ExtRenderOptions } from "./types";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

import { waterfallEngine } from "./engines/waterfall";
import { bubbleEngine } from "./engines/bubble";
import { heatmapEngine } from "./engines/heatmap";
import { orgchartEngine } from "./engines/orgchart";
import { evEngine } from "./engines/ev";
import { boxplotEngine } from "./engines/boxplot";
import { treemapEngine } from "./engines/treemap";
import { radarEngine } from "./engines/radar";
import { voronoiEngine } from "./engines/voronoi";
import { clusteredEngine } from "./engines/clustered";

/**
 * Точка входа расширения.
 * Возвращает SVG-строку или null, если тип не наш (тогда работает штатный Mermaid).
 */
export async function tryRenderExtension(
  source: string,
  options: ExtRenderOptions = {},
): Promise<string | null> {
  const type = detectType(source);
  if (!type) return null;

  const engine = await loadEngine(type);
  // Объединение движков даёт union моделей: parse/render не связаны дженериком.
  // Приводим к «движку над unknown» — на границе это безопасно, каждая ветка
  // switch гарантирует, что модель и рендер принадлежат одному движку.
  const anyEngine = engine as ExtEngine<unknown>;
  const parsed = anyEngine.parse(source);
  if (!parsed.ok || parsed.value === undefined) {
    const first = parsed.errors[0];
    const where = first ? ` (строка ${first.line}, колонка ${first.col + 1})` : "";
    throw new Error(`[${type}] ${first?.message ?? "ошибка разбора"}${where}`);
  }
  return anyEngine.render(parsed.value, options);
}

/**
 * Проверка синтаксиса для расширения.
 * `null` — тип не наш, проверку делает штатный Mermaid.
 */
export function validateExtensionSource(source: string): SyntaxCheckResult | null {
  const type = detectType(source);
  if (!type) return null;

  const engine = loadEngineSync(type);
  const parsed = engine.parse(source);
  if (parsed.ok) return { valid: true, issues: [] };

  return {
    valid: false,
    issues: parsed.errors.map((e) => ({
      severity: "error" as const,
      message: e.message,
      line: e.line,
    })),
  };
}

function loadEngineSync(type: ExtDiagramType) {
  switch (type) {
    case "waterfall":
      return waterfallEngine;
    case "bubble":
      return bubbleEngine;
    case "heatmap":
      return heatmapEngine;
    case "orgchart":
      return orgchartEngine;
    case "ev":
      return evEngine;
    case "boxplot":
      return boxplotEngine;
    case "treemap":
      return treemapEngine;
    case "radar":
      return radarEngine;
    case "voronoi":
      return voronoiEngine;
    case "clustered":
      return clusteredEngine;
  }
}

async function loadEngine(type: ExtDiagramType) {
  switch (type) {
    case "waterfall":
      return (await import("./engines/waterfall")).waterfallEngine;
    case "bubble":
      return (await import("./engines/bubble")).bubbleEngine;
    case "heatmap":
      return (await import("./engines/heatmap")).heatmapEngine;
    case "orgchart":
      return (await import("./engines/orgchart")).orgchartEngine;
    case "ev":
      return (await import("./engines/ev")).evEngine;
    case "boxplot":
      return (await import("./engines/boxplot")).boxplotEngine;
    case "treemap":
      return (await import("./engines/treemap")).treemapEngine;
    case "radar":
      return (await import("./engines/radar")).radarEngine;
    case "voronoi":
      return (await import("./engines/voronoi")).voronoiEngine;
    case "clustered":
      return (await import("./engines/clustered")).clusteredEngine;
  }
}

export { detectType, listTypes } from "./registry";
export type { ExtDiagramType, ExtRenderOptions } from "./types";
