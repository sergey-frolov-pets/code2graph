import type { DiagramLanguage } from "@/constants/diagram-library";
import {
  detectFormatFromFileName,
  type DiagramFormat,
} from "@/constants/diagram-formats";

export function resolveLibraryDiagramFormat(
  source: string,
  fileName?: string,
  language?: DiagramLanguage,
): DiagramFormat {
  if (language === "mermaid") {
    return "mermaid";
  }

  if (language === "graphml") {
    return "graphml";
  }

  return detectDiagramFormat(source, fileName);
}

export function detectDiagramFormat(
  source: string,
  fileName?: string,
): DiagramFormat {
  const fromFileName = fileName ? detectFormatFromFileName(fileName) : null;
  if (fromFileName) {
    return fromFileName;
  }

  const trimmed = source.trim();
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

  if (lower.includes("@startuml") || lower.includes("@enduml")) {
    return "plantuml";
  }

  if (lower.startsWith("graph ") || lower.startsWith("digraph ")) {
    return "plantuml";
  }

  return "plantuml";
}
