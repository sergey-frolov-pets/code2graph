import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";

function stripCommentsAndFences(source: string): string {
  return source
    .replace(/^\s*```mermaid\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*'.*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*%%.*$/gm, "")
    .trim();
}

function classifyPlantUmlKind(text: string, lower: string): DiagramKind | null {
  if (lower.includes("@startmindmap")) {
    return "mindmap";
  }
  if (lower.includes("@startgantt")) {
    return "gantt";
  }
  if (lower.includes("@startwbs")) {
    return "wbs";
  }
  if (lower.includes("@startnwdiag")) {
    return "nwdiag";
  }
  if (lower.includes("@startchronology")) {
    return "timeline";
  }

  if (
    /c4_container\.puml/i.test(text) ||
    /\bSystem_Boundary\s*\(/i.test(text) ||
    /\bContainer_Boundary\s*\(/i.test(text) ||
    /\bContainer(?:Db|Queue|_Ext)?\s*\(/i.test(text)
  ) {
    return "c4_container";
  }

  if (
    /c4_context\.puml/i.test(text) ||
    /\bPerson(?:_Ext)?\s*\(/i.test(text) ||
    /\bSystem_Ext\s*\(/i.test(text)
  ) {
    return "c4_context";
  }

  if (/<archimate\//i.test(text) || /\bBusiness_Actor\s*\(/i.test(text)) {
    return "archimate";
  }

  if (
    /\busecase\b/i.test(text) ||
    (/\bactor\s+.+\s+as\s+"/i.test(text) && /rectangle\s+"/i.test(text))
  ) {
    return "usecase";
  }

  if (/\bentity\s+\w+/i.test(text) && /[|o}{]+--[|o}{]+/.test(text)) {
    return "er";
  }

  if (
    /\b(?:node|frame|cloud|database|storage)\s+"/i.test(text) ||
    /<<artifact>>/i.test(text) ||
    /\bartifact\s+"/i.test(text)
  ) {
    return "deployment";
  }

  if (/\bobject\s+\w+/i.test(text)) {
    return "object";
  }

  if (/\bconcise\s+"/i.test(text) || /\brobust\s+"/i.test(text) || /@[0-9]+\s*$/m.test(text)) {
    return "timing";
  }

  if (
    /\b(?:actor|participant|boundary|control|entity|database|queue|collections)\b/i.test(text) &&
    /->>?/.test(text)
  ) {
    return "sequence";
  }

  if (
    /^\s*statediagram/i.test(lower) ||
    /\[\*\]/.test(text) ||
    /\bstate\s+"/i.test(text)
  ) {
    return "state";
  }

  if (
    /^\s*classdiagram\b/im.test(text) ||
    (/\bclass\s+\w+/i.test(text) && !/\bobject\s+/i.test(text)) ||
    /\binterface\s+\w+/i.test(text)
  ) {
    return "class";
  }

  if (
    /^\s*start\s*$/im.test(text) ||
    /:\s*[^;]+;/.test(text) ||
    /\|[^|]+\|/.test(text)
  ) {
    return "activity";
  }

  if (
    /\[[^\]]+\]/.test(text) ||
    /-->|->/.test(text) ||
    /\bcomponent\b/i.test(text)
  ) {
    return "graph";
  }

  return null;
}

function classifyMermaidKind(text: string): DiagramKind | null {
  if (/^\s*gantt\b/im.test(text)) {
    return "gantt";
  }
  if (/^\s*sequencediagram\b/im.test(text)) {
    return "sequence";
  }
  if (/^\s*c4context\b/im.test(text)) {
    return "c4_context";
  }
  if (/^\s*c4container\b/im.test(text)) {
    return "c4_container";
  }
  if (/^\s*erdiagram\b/im.test(text)) {
    return "er";
  }
  if (/^\s*classdiagram\b/im.test(text)) {
    return "class";
  }
  if (/^\s*statediagram/i.test(text)) {
    return "state";
  }
  if (/^\s*mindmap\b/im.test(text)) {
    return "mindmap";
  }
  if (/^\s*pie\b/im.test(text)) {
    return "pie";
  }
  if (/^\s*journey\b/im.test(text)) {
    return "journey";
  }
  if (/^\s*gitgraph\b/im.test(text)) {
    return "gitgraph";
  }
  if (/^\s*timeline\b/im.test(text)) {
    return "timeline";
  }
  if (/^\s*sankey-beta\b/im.test(text)) {
    return "sankey";
  }
  if (/^\s*xychart-beta\b/im.test(text)) {
    return "xychart";
  }
  if (/^\s*block-beta\b/im.test(text)) {
    return "block";
  }
  if (/^\s*requirementdiagram\b/im.test(text)) {
    return "requirement";
  }
  if (/^\s*quadrantchart\b/im.test(text)) {
    return "quadrant";
  }
  if (/^\s*architecture(?:-beta)?\b/im.test(text)) {
    return "architecture";
  }
  if (/^\s*packet(?:-beta)?\b/im.test(text)) {
    return "packet";
  }
  if (
    /^\s*start\s*$/im.test(text) ||
    /:\s*[^;]+;/.test(text) ||
    /\|[^|]+\|/.test(text)
  ) {
    return "activity";
  }
  if (/^\s*(flowchart|graph)\b/im.test(text)) {
    return "graph";
  }

  return null;
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

  if (format === "plantuml") {
    return classifyPlantUmlKind(text, lower) ?? "unknown";
  }

  if (format === "mermaid") {
    return classifyMermaidKind(text) ?? "unknown";
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
