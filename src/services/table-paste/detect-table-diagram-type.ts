import type { DiagramFormat } from "@/constants/diagram-formats";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import { detectType as detectMermaidExtType } from "@/services/mermaid/ext/registry";
import {
  TABLE_PASTE_DIAGRAM_TYPES,
  type TablePasteDiagramType,
} from "./types";

const SUPPORTED_SET = new Set<string>(TABLE_PASTE_DIAGRAM_TYPES);

function isTablePasteDiagramType(value: string): value is TablePasteDiagramType {
  return SUPPORTED_SET.has(value);
}

/**
 * Determines which table-paste diagram type is currently active in the editor,
 * or returns `null` if the current diagram does not accept tabular data.
 */
export function detectTableDiagramType(
  source: string,
  format: DiagramFormat,
): TablePasteDiagramType | null {
  if (format === "graphml" || format === "d2" || format === "structurizr") {
    return null;
  }

  if (format === "wiremark") {
    return "wireframe";
  }

  if (format === "mermaid") {
    const extType = detectMermaidExtType(source);
    if (extType && isTablePasteDiagramType(extType)) {
      return extType;
    }

    const kind = classifyDiagramKind(source, "mermaid");
    if (
      kind === "pie" ||
      kind === "xychart" ||
      kind === "quadrant" ||
      kind === "sankey" ||
      kind === "gantt" ||
      kind === "timeline" ||
      kind === "journey" ||
      kind === "packet" ||
      kind === "mindmap"
    ) {
      return kind;
    }

    return null;
  }

  if (format === "plantuml") {
    const kind = classifyDiagramKind(source, "plantuml");
    if (
      kind === "gantt" ||
      kind === "timeline" ||
      kind === "wbs" ||
      kind === "mindmap" ||
      kind === "nwdiag"
    ) {
      return kind;
    }

    return null;
  }

  return null;
}

export function supportsTablePaste(
  source: string,
  format: DiagramFormat,
): boolean {
  return detectTableDiagramType(source, format) !== null;
}
