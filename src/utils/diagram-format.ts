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

  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("<?xml") &&
    (lower.includes("<graphml") || lower.includes(":graphml"))
  ) {
    return "graphml";
  }

  if (
    lower.startsWith("```mermaid") ||
    /^(graph|flowchart|sequencediagram|classdiagram|statediagram|erdiagram|journey|gantt|pie|mindmap|timeline|gitgraph|sankey-beta|xychart-beta|block-beta)\b/i.test(
      trimmed,
    )
  ) {
    return "mermaid";
  }

  if (
    lower.includes("@startuml") ||
    lower.includes("@enduml") ||
    lower.includes("@startgantt") ||
    /^@start(mindmap|wbs|json|yaml|ditaa|salt|dot|chen|nwdiag|chronology|ebnf|regex|board|math|latex)\b/i.test(
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
