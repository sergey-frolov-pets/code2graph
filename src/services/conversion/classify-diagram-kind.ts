import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";

function stripCommentsAndFences(source: string): string {
  return source
    .replace(/^\s*```mermaid\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*'.*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();
}

export function classifyDiagramKind(
  source: string,
  format: DiagramFormat,
): DiagramKind {
  const text = stripCommentsAndFences(source);
  const lower = text.toLowerCase();

  if (format === "graphml" || lower.includes("<graphml")) {
    return "graph";
  }

  if (
    lower.includes("@startgantt") ||
    (format === "mermaid" && /^\s*gantt\b/im.test(text))
  ) {
    return "gantt";
  }

  if (
    lower.includes("sequencediagram") ||
    (format === "plantuml" &&
      /\b(actor|participant|boundary|control|entity)\b/i.test(text) &&
      /->>?/.test(text))
  ) {
    return "sequence";
  }

  if (
    /c4_container\.puml/i.test(text) ||
    /\bSystem_Boundary\s*\(/i.test(text) ||
    /\bContainer_Boundary\s*\(/i.test(text)
  ) {
    return "c4_container";
  }

  if (
    /c4_context\.puml/i.test(text) ||
    /\bPerson\s*\(/i.test(text) ||
    /\bSystem_Ext\s*\(/i.test(text)
  ) {
    return "c4_context";
  }

  if (
    /^\s*erdiagram\b/im.test(text) ||
    lower.includes("erdiagram")
  ) {
    return "er";
  }

  if (
    /^\s*classdiagram\b/im.test(text) ||
    /\bclass\s+\w+/i.test(text) ||
    /\binterface\s+\w+/i.test(text)
  ) {
    return "class";
  }

  if (
    /^\s*statediagram/i.test(text) ||
    /\[\*\]/.test(text) ||
    /\bstate\s+"/i.test(text)
  ) {
    return "state";
  }

  if (
    /^\s*start\s*$/im.test(text) ||
    /:\s*[^;]+;/.test(text) ||
    /\|[^|]+\|/.test(text)
  ) {
    return "activity";
  }

  if (
    /^\s*(flowchart|graph)\b/im.test(text) ||
    /\[[^\]]+\]/.test(text) ||
    /-->|->/.test(text)
  ) {
    return "graph";
  }

  return "unknown";
}

export function detectDiagramDirection(
  source: string,
  format: DiagramFormat,
): "TB" | "LR" | undefined {
  const text = stripCommentsAndFences(source);

  if (format === "graphml" && /rankdir\s*=\s*["']?lr["']?/i.test(text)) {
    return "LR";
  }

  if (/left\s+to\s+right\s+direction/i.test(text)) {
    return "LR";
  }

  if (/flowchart\s+lr/i.test(text) || /graph\s+lr/i.test(text)) {
    return "LR";
  }

  if (/direction\s+lr/i.test(text)) {
    return "LR";
  }

  if (format === "mermaid" && /flowchart\s+td/i.test(text)) {
    return "TB";
  }

  return "TB";
}
