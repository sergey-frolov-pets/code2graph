import type { ExtDiagramType } from "./types";

/**
 * Реестр типов: канонический тип + алиасы.
 * Алиасы нужны для совместимости с примерами из референсного репозитория.
 */
export const TYPE_ALIASES: Record<ExtDiagramType, string[]> = {
  waterfall: ["waterfall", "waterfall-variance", "waterfall-multi", "waterfall-scenario"],
  bubble: ["bubble", "bubblechart"],
  heatmap: ["heatmap", "heat-map"],
  orgchart: ["orgchart", "org"],
  ev: ["ev", "evchart"],
};

const ALIAS_TO_TYPE = new Map<string, ExtDiagramType>();
for (const [type, aliases] of Object.entries(TYPE_ALIASES) as [ExtDiagramType, string[]][]) {
  for (const alias of aliases) ALIAS_TO_TYPE.set(alias, type);
}

/** Первая значимая строка без комментариев `%%`. */
export function firstMeaningfulLine(source: string): string {
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;
    return line;
  }
  return "";
}

/** Тип расширения по первой строке или null, если это обычная Mermaid-диаграмма. */
export function detectType(source: string): ExtDiagramType | null {
  const head = firstMeaningfulLine(source).toLowerCase();
  if (!head) return null;
  const keyword = head.split(/[\s:]/)[0];
  return ALIAS_TO_TYPE.get(keyword) ?? null;
}

export function listTypes(): ExtDiagramType[] {
  return Object.keys(TYPE_ALIASES) as ExtDiagramType[];
}
