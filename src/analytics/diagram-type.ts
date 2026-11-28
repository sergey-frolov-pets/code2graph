/**
 * Тип диаграммы для событий GoatCounter.
 *
 * Счётчики знают только язык (`mermaid`, `plantuml`) — тип диаграммы нужен
 * визарду и подписям, но в отчёт идёт лишь язык: `open/mermaid`.
 * Тип по-прежнему вычисляется из исходника, чтобы визард знал, что
 * открывать, но наружу не уходит.
 *
 * В отчёт попадают только язык и тип из нашего словаря. Исходный текст
 * и имена файлов не отправляются.
 */

import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import {
  detectType as detectMermaidExtType,
  firstMeaningfulLine,
} from "@/services/mermaid/ext/registry";
import { reportOpen } from "./usage";

const EVENT_SLUG_PATTERN = /[^a-z0-9_-]+/g;

/**
 * Mermaid header keyword -> stable type slug.
 * Flowchart stays distinct from `graph` so the dashboard matches the syntax
 * the user actually opened or exported.
 */
const MERMAID_HEADER_SLUGS: Record<string, string> = {
  graph: "graph",
  flowchart: "flowchart",
  sequencediagram: "sequence",
  classdiagram: "class",
  statediagram: "state",
  "statediagram-v2": "state",
  erdiagram: "er",
  journey: "journey",
  gantt: "gantt",
  pie: "pie",
  mindmap: "mindmap",
  timeline: "timeline",
  gitgraph: "gitgraph",
  sankey: "sankey",
  "sankey-beta": "sankey",
  xychart: "xychart",
  "xychart-beta": "xychart",
  block: "block",
  "block-beta": "block",
  c4context: "c4_context",
  c4container: "c4_container",
  c4component: "c4_container",
  c4deployment: "deployment",
  requirementdiagram: "requirement",
  quadrantchart: "quadrant",
  architecture: "architecture",
  "architecture-beta": "architecture",
  packet: "packet",
  "packet-beta": "packet",
};

export function sanitizeEventSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(EVENT_SLUG_PATTERN, "-")
    .replace(/^-+|-+$/g, "");
}

/** `mermaid` + `xychart` -> `mermaid-xychart`. Type is omitted when unknown. */
export function diagramAnalyticsKind(
  format: string,
  type: string | null | undefined,
): string {
  const formatSlug = sanitizeEventSlug(format) || "unknown";
  const typeSlug = type ? sanitizeEventSlug(type) : "";
  return typeSlug ? `${formatSlug}-${typeSlug}` : formatSlug;
}

function unwrapMermaidFence(source: string): string {
  return source
    .replace(/^\s*```(?:mermaid)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");
}

function mermaidHeaderSlug(source: string): string | null {
  const head = firstMeaningfulLine(unwrapMermaidFence(source)).toLowerCase();
  if (!head) {
    return null;
  }
  const keyword = head.split(/[\s:]/)[0] ?? "";
  return MERMAID_HEADER_SLUGS[keyword] ?? null;
}

/**
 * Concrete diagram type for analytics, or null when the source does not
 * declare one. Mermaid extensions (waterfall, bubble, …) win over the generic
 * flowchart/graph classification.
 */
export function resolveDiagramTypeSlug(
  source: string,
  format: DiagramFormat,
): string | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  if (format === "mermaid") {
    const extensionType = detectMermaidExtType(trimmed);
    if (extensionType) {
      return extensionType;
    }
    const header = mermaidHeaderSlug(trimmed);
    if (header) {
      return header;
    }
  }

  const kind = classifyDiagramKind(trimmed, format);
  return kind === "unknown" ? null : kind;
}

export function resolveTypedDiagramKind(
  format: DiagramFormat,
  source: string,
): string {
  return diagramAnalyticsKind(format, resolveDiagramTypeSlug(source, format));
}

/** User opened a diagram (file, library, shared launch) → `open/<язык>`. */
export function trackDiagramOpen(format: string, source: string): void {
  void source;
  reportOpen(format);
}
