/**
 * Diagram-type slugs for GoatCounter events.
 *
 * Pageviews and the older save/open events only know the language
 * (`mermaid`, `plantuml`). The dashboard at stats.code2graph.ru needs the
 * concrete type as well, for example Mermaid / XY chart:
 * `open-diagram-mermaid-xychart`, `save-image-svg-mermaid-xychart`.
 *
 * Only the language and type are sent. Source text and file names stay local.
 */

import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { isDiagramFormat } from "@/constants/diagram-format-ids";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import {
  detectType as detectMermaidExtType,
  firstMeaningfulLine,
} from "@/services/mermaid/ext/registry";
import { trackEvent, trackOpen, trackSave } from "./goatcounter";

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
  format: string,
  source: string,
): string {
  const type = isDiagramFormat(format)
    ? resolveDiagramTypeSlug(source, format)
    : null;
  return diagramAnalyticsKind(format, type);
}

function typeTitle(format: string, source: string): string {
  const type = isDiagramFormat(format)
    ? resolveDiagramTypeSlug(source, format)
    : null;
  return type ? `${format} / ${type}` : format;
}

/** User opened a diagram (file, library, shared launch). */
export function trackDiagramOpen(
  format: string,
  source: string,
  titlePrefix = "Open diagram",
): void {
  const kind = resolveTypedDiagramKind(format, source);
  trackOpen(`diagram-${kind}`, `${titlePrefix}: ${typeTitle(format, source)}`);
}

/** User saved source or exported SVG/PNG of the current diagram. */
export function trackDiagramExport(
  action: "source" | "svg" | "png",
  format: string,
  source: string,
): void {
  const kind = resolveTypedDiagramKind(format, source);
  const label = typeTitle(format, source);
  if (action === "source") {
    trackSave(`diagram-${kind}`, `Save diagram: ${label}`);
    return;
  }
  const image = action === "svg" ? "SVG" : "PNG";
  trackSave(`image-${action}-${kind}`, `Export ${image}: ${label}`);
}

/** User copied the current diagram PNG to the clipboard. */
export function trackClipboardImageCopy(format: string, source: string): void {
  const kind = resolveTypedDiagramKind(format, source);
  trackEvent(`copy-image-png-${kind}`, `Copy PNG: ${typeTitle(format, source)}`);
}

/**
 * User inserted something from the clipboard.
 * `table` is the toolbar action; `source` is a pasted diagram in the editor.
 */
export function trackClipboardPaste(
  channel: "table" | "source",
  format: string,
  type: string | null,
): void {
  const kind = diagramAnalyticsKind(format, type);
  const label = type ? `${format} / ${type}` : format;
  const title =
    channel === "table"
      ? `Paste table: ${label}`
      : `Paste from clipboard: ${label}`;
  trackEvent(`paste-${channel}-${kind}`, title);
}
