import type { DiagramLanguage } from "@/constants/diagram-library";
import {
  detectFormatFromFileName,
  type DiagramFormat,
} from "@/constants/diagram-formats";

export function detectDiagramFormatFromSource(source: string): DiagramFormat | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  const withoutMermaidComments = trimmed
    .replace(/^(?:%%[^\n]*\n)+/m, "")
    .trim();
  const lower = withoutMermaidComments.toLowerCase();
  const fullLower = trimmed.toLowerCase();

  if (
    fullLower.startsWith("<?xml") &&
    (fullLower.includes("<graphml") || fullLower.includes(":graphml"))
  ) {
    return "graphml";
  }

  if (
    lower.startsWith("```mermaid") ||
    /^(graph|flowchart|sequencediagram|classdiagram|statediagram|erdiagram|journey|gantt|pie|mindmap|timeline|gitgraph|sankey-beta|xychart-beta|block-beta)\b/i.test(
      withoutMermaidComments,
    )
  ) {
    return "mermaid";
  }

  if (
    fullLower.includes("@startuml") ||
    fullLower.includes("@enduml") ||
    fullLower.includes("@startgantt") ||
    /^@start(mindmap|wbs|json|yaml|ditaa|salt|dot|chen|nwdiag|chronology|ebnf|regex|board|math|latex)\b/im.test(
      trimmed,
    )
  ) {
    return "plantuml";
  }

  if (lower.startsWith("graph ") || lower.startsWith("digraph ")) {
    return "plantuml";
  }

  return null;
}

export function resolveLibraryDiagramFormat(
  source: string,
  fileName?: string,
  language?: DiagramLanguage,
): DiagramFormat {
  if (source.trim()) {
    return detectDiagramFormat(source, fileName);
  }

  if (language === "mermaid" || language === "graphml" || language === "plantuml") {
    return language;
  }

  return detectDiagramFormat(source, fileName);
}

export function detectDiagramFormat(
  source: string,
  fileName?: string,
): DiagramFormat {
  const fromSource = detectDiagramFormatFromSource(source);
  if (fromSource) {
    return fromSource;
  }

  const fromFileName = fileName ? detectFormatFromFileName(fileName) : null;
  if (fromFileName) {
    return fromFileName;
  }

  return "plantuml";
}
