import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";

function stripCommentsAndFences(source: string): string {
  return source
    .replace(/^\s*```(?:mermaid|plantuml|d2|structurizr|dsl|wiremark|graphml|xml)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*'.*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*%%.*$/gm, "")
    .replace(/^\s*#(?!\w+\b).*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
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
    /c4_component\.puml/i.test(text) ||
    /\bSystem_Boundary\s*\(/i.test(text) ||
    /\bContainer_Boundary\s*\(/i.test(text) ||
    /\bContainer(?:Db|Queue|_Ext|Db_Ext|Queue_Ext)?\s*\(/i.test(text)
  ) {
    return "c4_container";
  }

  if (
    /c4_context\.puml/i.test(text) ||
    /\bPerson(?:_Ext)?\s*\(/i.test(text) ||
    /\bSystem(?:_Ext|Db|Queue)?\s*\(/i.test(text)
  ) {
    return "c4_context";
  }

  if (
    /<archimate\//i.test(text) ||
    /\b(?:Business_Actor|Business_Process|Business_Service|Application_Component|Application_Service|Technology_Node|Technology_Service)\s*\(/i.test(text)
  ) {
    return "archimate";
  }

  if (
    /\busecase\b/i.test(text) ||
    /\([^)\n]+\)\s*(?:as\s+\w+\s*)?(?:-->|<--|\.\.>)/m.test(text) ||
    (/(?:-->|<--|\.\.>)\s*\([^)\n]+\)/m.test(text) && /\bactor\b/i.test(text)) ||
    (/\bactor\s+.+\s+as\s+"/i.test(text) && /rectangle\s+"/i.test(text))
  ) {
    return "usecase";
  }

  if (
    (/\bentity\s+[\p{L}\p{N}_"]+/iu.test(text) && /[|o}{]+(?:--|\.\.)[|o}{]+/.test(text)) ||
    /[|o}{]+--[|o}{]+/.test(text)
  ) {
    return "er";
  }

  if (
    /c4_deployment\.puml/i.test(text) ||
    /\bDeployment_Node\s*\(/i.test(text) ||
    /\b(?:node|frame|cloud|database|storage)\s+"[^"]+"\s*\{/i.test(text) ||
    /<<artifact>>/i.test(text) ||
    /\bartifact\s+"/i.test(text)
  ) {
    return "deployment";
  }

  if (/^\s*object\s+[\p{L}\p{N}_"]+/imu.test(text)) {
    return "object";
  }

  if (
    /\bconcise\s+"/i.test(text) ||
    /\brobust\s+"/i.test(text) ||
    /\bclock\s+"/i.test(text) ||
    /\bbinary\s+"/i.test(text) ||
    /^@[0-9]+\s*$/m.test(text)
  ) {
    return "timing";
  }

  if (
    /^\s*(?:actor|participant|boundary|control|entity|database|queue|collections)\b/im.test(text) &&
    /(?:->|-->|->>|-->>|<-|<--)/.test(text) &&
    !/\[[^\]]+\]\s*--+>/.test(text) &&
    !/\busecase\b/i.test(text)
  ) {
    return "sequence";
  }

  if (
    /^\s*[\p{L}\p{N}_"]+\s*(?:->|-->|->>|-->>)\s*[\p{L}\p{N}_"]+\s*:/mu.test(text) &&
    !/^\s*state\b/im.test(text) &&
    !/\[\*\]/.test(text) &&
    !/\bclass\s+/i.test(text)
  ) {
    return "sequence";
  }

  if (
    /^\s*statediagram/i.test(lower) ||
    /\[\*\]/.test(text) ||
    /^\s*state\s+/im.test(text)
  ) {
    return "state";
  }

  if (
    /^\s*classdiagram\b/im.test(text) ||
    (/\b(?:abstract\s+)?class\s+[\p{L}\p{N}_"]+/iu.test(text) && !/^\s*object\s+/im.test(text)) ||
    /\binterface\s+[\p{L}\p{N}_"]+\s*\{/iu.test(text) ||
    /\benum\s+[\p{L}\p{N}_"]+/iu.test(text) ||
    /<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|o--/.test(text)
  ) {
    return "class";
  }

  if (
    /^\s*start\s*$/im.test(text) ||
    /^\s*stop\s*$/im.test(text) ||
    /:\s*[^;\n]+;/.test(text) ||
    /^\s*\|[^|\n]+\|\s*$/m.test(text)
  ) {
    return "activity";
  }

  if (
    /\[[^\]]+\]/.test(text) ||
    /-->|->|\.\.>/.test(text) ||
    /\b(?:component|package|rectangle|node|database|cloud|folder|frame)\b/i.test(text)
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
  if (/^\s*c4container\b/im.test(text) || /^\s*c4component\b/im.test(text)) {
    return "c4_container";
  }
  if (/^\s*c4deployment\b/im.test(text)) {
    return "deployment";
  }
  if (/^\s*erdiagram\b/im.test(text)) {
    return "er";
  }
  if (/^\s*classdiagram\b/im.test(text)) {
    return "class";
  }
  if (/^\s*statediagram(?:-v2)?\b/im.test(text)) {
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
  if (/^\s*sankey(?:-beta)?\b/im.test(text)) {
    return "sankey";
  }
  if (/^\s*xychart(?:-beta)?\b/im.test(text)) {
    return "xychart";
  }
  if (/^\s*block(?:-beta)?\b/im.test(text)) {
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
    /^\s*\|[^|\n]+\|\s*$/m.test(text)
  ) {
    return "activity";
  }
  if (/^\s*(flowchart|graph)\b/im.test(text)) {
    return "graph";
  }

  return null;
}

function classifyD2Kind(text: string): DiagramKind {
  if (/\bshape\s*:\s*sequence_diagram\b/i.test(text)) {
    return "sequence";
  }
  if (/\bshape\s*:\s*class\b/i.test(text)) {
    return "class";
  }
  if (/\bshape\s*:\s*sql_table\b/i.test(text)) {
    return "er";
  }
  if (
    /\bnetwork\s*:/i.test(text) ||
    /\bshape\s*:\s*(?:hexagon|queue|cloud|cylinder|package)\b/i.test(text)
  ) {
    if (/\bshape\s*:\s*person\b/i.test(text) && !/\bnetwork\s*:/i.test(text)) {
      return "graph";
    }
    if (/\bnetwork\s*:/i.test(text) || /\bshape\s*:\s*(?:hexagon|queue)\b/i.test(text)) {
      return "architecture";
    }
  }
  return "graph";
}

function classifyStructurizrKind(text: string): DiagramKind {
  if (/\bdeployment\b[\s\S]*?\{/i.test(text) || /\bdeploymentEnvironment\b/i.test(text)) {
    return "deployment";
  }
  if (
    /\bcontainer\s+[\p{L}\p{N}_"]+/iu.test(text) ||
    /\bcomponent\s+[\p{L}\p{N}_"]+/iu.test(text) ||
    /=\s*(?:container|component)\b/i.test(text)
  ) {
    return "c4_container";
  }
  if (
    /\bsystemContext\b/i.test(text) ||
    /\bsystemLandscape\b/i.test(text) ||
    /\bsoftwareSystem\b/i.test(text) ||
    /\bperson\b/i.test(text)
  ) {
    return "c4_context";
  }
  return "c4_context";
}

function classifyWiremarkKind(text: string): DiagramKind {
  if (/\bWireframe\b/i.test(text) || /\bFlow\b/i.test(text)) {
    return "wireframe";
  }
  return "wireframe";
}

export function classifyDiagramKind(
  source: string,
  format: DiagramFormat,
): DiagramKind {
  const text = stripCommentsAndFences(source);
  const lower = text.toLowerCase();

  if (format === "wiremark") {
    return classifyWiremarkKind(text);
  }

  if (format === "d2") {
    return classifyD2Kind(text);
  }

  if (format === "structurizr") {
    return classifyStructurizrKind(text);
  }

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

  if (format === "graphml" && /rankdir\s*=\s*["']?(?:lr|rl)["']?/i.test(text)) {
    return "LR";
  }

  if (format === "d2") {
    if (/^\s*direction\s*:\s*(?:right|left)\b/im.test(text)) {
      return "LR";
    }
    if (/^\s*direction\s*:\s*(?:down|up)\b/im.test(text)) {
      return "TB";
    }
  }

  if (format === "structurizr") {
    if (/\bautolayout\s+(?:lr|rl)\b/i.test(text)) {
      return "LR";
    }
    if (/\bautolayout\s+(?:tb|bt)\b/i.test(text)) {
      return "TB";
    }
  }

  if (format === "wiremark") {
    if (/^\s*Flow\s+LR\b/im.test(text)) {
      return "LR";
    }
  }

  if (
    /left\s+to\s+right\s+direction/i.test(text) ||
    /\bLAYOUT_LEFT_RIGHT\s*\(\s*\)/i.test(text)
  ) {
    return "LR";
  }

  if (/(?:flowchart|graph)\s+(?:lr|rl)\b/i.test(text)) {
    return "LR";
  }

  if (/direction\s+(?:lr|rl)\b/i.test(text)) {
    return "LR";
  }

  if (format === "mermaid" && /(?:flowchart|graph)\s+(?:td|tb|bt)\b/i.test(text)) {
    return "TB";
  }

  return "TB";
}
