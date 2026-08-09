import type { DiagramFormat } from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { stripSourceComments } from "@/services/conversion/parse/parse-utils";
import {
  parseErMermaid,
  parseSequenceMermaid,
  parseStateMermaid,
} from "@/services/conversion/parse/parse-mermaid";
import { parseSequencePlantUml } from "@/services/conversion/parse/parse-plantuml";
import { parseGraphml } from "@/services/graphml/graphml-engine";
import {
  parseActivityMermaid,
  parseArchimatePlantUml,
  parseArchitectureMermaid,
  parseBlockMermaid,
  parseC4Mermaid,
  parseDeploymentPlantUml,
  parseErPlantUml,
  parseGitgraphMermaid,
  parseJourneyMermaid,
  parseMindmapMermaid,
  parseMindmapPlantUml,
  parseNwdiagPlantUml,
  parseObjectPlantUml,
  parsePacketMermaid,
  parsePieMermaid,
  parseQuadrantMermaid,
  parseRequirementMermaid,
  parseSankeyMermaid,
  parseTimelineMermaid,
  parseTimingPlantUml,
  parseUsecasePlantUml,
  parseWbsPlantUml,
  parseXychartMermaid,
} from "@/services/conversion/parse/kind-parsers";

export class DiagramParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramParseError";
  }
}

function graphmlToIr(source: string, format: DiagramFormat): DiagramIR {
  const parsed = parseGraphml(source);
  const usedIds = new Set<string>();
  const nodes: DiagramNode[] = parsed.nodes.map((node) => ({
    id: uniqueDiagramId(node.id, usedIds),
    label: node.label,
    matchConfidence: 1,
  }));

  const idByOriginal = new Map(
    parsed.nodes.map((node, index) => [node.id, nodes[index].id]),
  );

  const edges: DiagramEdge[] = parsed.edges.map((edge, index) => ({
    id: `e${index + 1}`,
    source: idByOriginal.get(edge.source) ?? edge.source,
    target: idByOriginal.get(edge.target) ?? edge.target,
    label: edge.label,
    matchConfidence: 1,
  }));

  return {
    version: CONVERSION_IR_VERSION,
    kind: "graph",
    direction: parsed.direction ?? detectDiagramDirection(source, format),
    nodes,
    edges,
    metadata: { sourceFormat: format },
  };
}

function registerPlantUmlAlias(
  aliasToId: Map<string, string>,
  alias: string,
  id: string,
): void {
  aliasToId.set(alias, id);
  aliasToId.set(alias.toLowerCase(), id);
}

function parseComponentPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("graph");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const groups: DiagramGroup[] = [];

  for (const match of source.matchAll(/package\s+"([^"]+)"\s*\{/gi)) {
    const label = match[1].trim();
    const id = uniqueDiagramId(label, usedIds);
    groups.push({ id, label });
    registerPlantUmlAlias(aliasToId, id, id);
    ir.nodes.push({ id, label, groupId: id, matchConfidence: 1 });
  }

  const nodePatterns: Array<RegExp> = [
    /\[([^\]]+)\](?:\s+as\s+(\w+))?/g,
    /rectangle\s+"([^"]+)"(?:\s+as\s+(\w+))?/gi,
    /node\s+"([^"]+)"(?:\s+as\s+(\w+))?/gi,
    /(\w+)\s*\[([^\]]+)\]/g,
  ];

  for (const pattern of nodePatterns) {
    for (const match of source.matchAll(pattern)) {
      const label = (match[1] ?? match[2] ?? "").trim();
      const alias = match[2] ?? match[1];
      if (!label || label.includes("lasts")) {
        continue;
      }
      const id = uniqueDiagramId(alias, usedIds);
      registerPlantUmlAlias(aliasToId, alias, id);
      if (!ir.nodes.some((node) => node.id === id)) {
        ir.nodes.push({ id, label, matchConfidence: 1 });
      }
    }
  }

  let edgeIndex = 0;
  const edgePatterns: Array<RegExp> = [
    /\[([^\]]+)\]\s*(?:-[->]+)\s*(?:\|([^|]+)\|\s*)?\[([^\]]+)\]/g,
    /(\w+)\s*(?:-[->]+)\s*(?:\|([^|]+)\|\s*)?(\w+)/g,
  ];

  for (const pattern of edgePatterns) {
    for (const match of source.matchAll(pattern)) {
      const fromKey = match[1].trim();
      const toKey = (match[3] ?? match[4] ?? "").trim();
      const label = match[2]?.trim();
      const sourceId =
        aliasToId.get(fromKey) ??
        aliasToId.get(fromKey.replace(/"/g, "")) ??
        ir.nodes.find((node) => node.label === fromKey)?.id;
      const targetId =
        aliasToId.get(toKey) ??
        aliasToId.get(toKey.replace(/"/g, "")) ??
        ir.nodes.find((node) => node.label === toKey)?.id;
      if (!sourceId || !targetId) {
        continue;
      }
      edgeIndex += 1;
      ir.edges.push({
        id: `e${edgeIndex}`,
        source: sourceId,
        target: targetId,
        label,
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

function parseClassPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("class");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const classPattern = /\b(?:class|interface|enum)\s+(\w+)/g;
  for (const match of source.matchAll(classPattern)) {
    const label = match[1];
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      kind: "class",
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  const relationPattern = /(\w+)\s+([-.]+)\s+(\w+)/g;
  let edgeIndex = 0;
  for (const match of source.matchAll(relationPattern)) {
    const from = match[1];
    const to = match[3];
    if (!idByLabel.has(from) || !idByLabel.has(to)) {
      continue;
    }
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: idByLabel.get(from)!,
      target: idByLabel.get(to)!,
      kind: match[2].includes("|") ? "inherit" : "arrow",
      matchConfidence: 1,
    });
  }

  return ir;
}

function parseStatePlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("state");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const names = new Set<string>();
  for (const match of source.matchAll(/(\[\*\]|"[^"]+"|\b[A-Za-z]\w*)\s*-->/g)) {
    names.add(match[1].replace(/"/g, ""));
  }
  for (const match of source.matchAll(/-->\s*(\[\*\]|"[^"]+"|\b[A-Za-z]\w*)/g)) {
    names.add(match[1].replace(/"/g, ""));
  }

  for (const name of names) {
    if (name === "[*]") {
      continue;
    }
    ir.nodes.push({
      id: uniqueDiagramId(name, usedIds),
      label: name,
      kind: name === "start" || name === "end" ? "start" : "default",
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  let edgeIndex = 0;
  for (const match of source.matchAll(
    /(\[\*\]|"[^"]+"|\b\w+)\s*-->\s*(\[\*\]|"[^"]+"|\b\w+)/g,
  )) {
    const from = match[1].replace(/"/g, "");
    const to = match[2].replace(/"/g, "");
    if (from === "[*]" || to === "[*]") {
      continue;
    }
    const sourceId = idByLabel.get(from);
    const targetId = idByLabel.get(to);
    if (!sourceId || !targetId) {
      continue;
    }
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: sourceId,
      target: targetId,
      matchConfidence: 1,
    });
  }

  return ir;
}

function parseActivityPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("activity");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;
  let edgeIndex = 0;

  for (const match of source.matchAll(/:\s*([^;]+);/g)) {
    const label = match[1].trim();
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({ id, label, matchConfidence: 1 });
    if (previousId) {
      edgeIndex += 1;
      ir.edges.push({
        id: `e${edgeIndex}`,
        source: previousId,
        target: id,
        matchConfidence: 1,
      });
    }
    previousId = id;
  }

  return ir;
}

function parseC4PlantUml(source: string, format: DiagramFormat): DiagramIR {
  const kind = classifyDiagramKind(source, format);
  const ir = createEmptyDiagramIR(
    kind === "c4_container" ? "c4_container" : "c4_context",
  );
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const elementPattern =
    /\b(Person(?:_Ext)?|System(?:_Ext)?|Container(?:Db|Queue|_Ext)?)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/g;
  for (const match of source.matchAll(elementPattern)) {
    const type = match[1];
    const alias = match[2].trim();
    const label = match[3] || alias;
    ir.nodes.push({
      id: uniqueDiagramId(alias, usedIds),
      label,
      kind: type.startsWith("Person") ? "actor" : type.startsWith("Container") ? "container" : "system",
      semantic: { c4Type: type },
      matchConfidence: 1,
    });
  }

  const idByAlias = new Map(ir.nodes.map((node) => [node.id, node.id]));
  for (const match of source.matchAll(/\bRel(?:_\w+)?\s*\(\s*([^,]+)\s*,\s*([^,]+)/g)) {
    const from = match[1].trim();
    const to = match[2].trim();
    const sourceId = idByAlias.get(from);
    const targetId = idByAlias.get(to);
    if (!sourceId || !targetId) {
      continue;
    }
    ir.edges.push({
      id: `e${ir.edges.length + 1}`,
      source: sourceId,
      target: targetId,
      matchConfidence: 1,
    });
  }

  return ir;
}

function parseGanttPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;

  for (const match of source.matchAll(/\[(.+?)\]/g)) {
    const label = match[1].trim();
    if (label.toLowerCase().includes("starts at")) {
      continue;
    }
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({ id, label, kind: "task", matchConfidence: 1 });
    if (previousId) {
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: previousId,
        target: id,
        kind: "arrow",
        matchConfidence: 1,
      });
    }
    previousId = id;
  }

  return ir;
}

function registerMermaidNode(
  ir: DiagramIR,
  id: string,
  label: string,
  usedIds: Set<string>,
  options?: Partial<DiagramNode>,
): void {
  if (ir.nodes.some((node) => node.id === id)) {
    return;
  }

  usedIds.add(id);
  ir.nodes.push({
    id,
    label,
    matchConfidence: 1,
    ...options,
  });
}

function extractNodeIdsFromMermaidBody(body: string): string[] {
  const nodeIdPatterns = [
    /(\w+)\s*\(\[/g,
    /(\w+)\s*\(\(/g,
    /(\w+)\[\(/g,
    /(\w+)\s*\[\[/g,
    /(\w+)\s*\[(?!\[)/g,
    /(\w+)\s*\((?!\[)/g,
    /(\w+)\s*\{/g,
  ];
  const ids = new Set<string>();

  for (const pattern of nodeIdPatterns) {
    for (const nodeMatch of body.matchAll(pattern)) {
      ids.add(nodeMatch[1]);
    }
  }

  return [...ids];
}

function readMermaidSubgraphBlocks(source: string): Array<{
  id: string;
  label: string;
  body: string;
}> {
  const blocks: Array<{ id: string; label: string; body: string }> = [];
  const lines = source.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const header = line.match(/^\s*subgraph\s+(\w+)(?:\s*\[([^\]]+)\])?\s*$/i);
    if (!header) {
      index += 1;
      continue;
    }

    const bodyLines: string[] = [];
    index += 1;
    while (index < lines.length && !/^\s*end\s*$/i.test(lines[index])) {
      bodyLines.push(lines[index]);
      index += 1;
    }

    blocks.push({
      id: header[1],
      label: header[2]?.trim() || header[1],
      body: bodyLines.join("\n"),
    });
    index += 1;
  }

  return blocks;
}

function applyMermaidSubgraphGroups(source: string, ir: DiagramIR): void {
  const groups: DiagramGroup[] = [];

  for (const block of readMermaidSubgraphBlocks(source)) {
    groups.push({ id: block.id, label: block.label });

    for (const nodeId of extractNodeIdsFromMermaidBody(block.body)) {
      const node = ir.nodes.find((entry) => entry.id === nodeId);
      if (node) {
        node.groupId = block.id;
      }
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }
}

function stripMermaidSubgraphDeclarations(source: string): string {
  return source.replace(/^\s*subgraph\s+[^\n]*$/gim, "");
}

function parseFlowchartMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("graph");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const semanticSource = stripMermaidSubgraphDeclarations(source);

  const nodePatterns: Array<{
    pattern: RegExp;
    kind: DiagramNode["kind"];
  }> = [
    { pattern: /(\w+)\s*\(\[([^\]]+)\]\)/g, kind: "default" },
    { pattern: /(\w+)\s*\(\(([^)]+)\)\)/g, kind: "default" },
    { pattern: /(\w+)\[\(([^)]+)\)\]/g, kind: "default" },
    { pattern: /(\w+)\s*\[\[([^\]]+)\]\]/g, kind: "default" },
    { pattern: /(\w+)\s*\[(?!\[)([^\]]+)\]/g, kind: "default" },
    { pattern: /(\w+)\s*\((?!\[)([^)]+)\)/g, kind: "default" },
    { pattern: /(\w+)\s*\{([^}]+)\}/g, kind: "decision" },
  ];

  for (const { pattern, kind } of nodePatterns) {
    for (const match of semanticSource.matchAll(pattern)) {
      registerMermaidNode(ir, match[1], match[2].trim(), usedIds, { kind });
    }
  }

  let edgeIndex = 0;
  for (const match of semanticSource.matchAll(
    /(\w+)\s*(?:-->|---|-.->|==>)\s*(?:\|([^|]+)\|\s*)?(\w+)/g,
  )) {
    edgeIndex += 1;
    const sourceId = match[1];
    const targetId = match[3];
    if (!ir.nodes.some((node) => node.id === sourceId)) {
      registerMermaidNode(ir, sourceId, sourceId, usedIds);
    }
    if (!ir.nodes.some((node) => node.id === targetId)) {
      registerMermaidNode(ir, targetId, targetId, usedIds);
    }
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: sourceId,
      target: targetId,
      label: match[2]?.trim(),
      matchConfidence: 1,
    });
  }

  applyMermaidSubgraphGroups(source, ir);

  return ir;
}

function parseClassMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("class");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(/\bclass\s+(\w+)/g)) {
    const label = match[1];
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      kind: "class",
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  let edgeIndex = 0;
  for (const match of source.matchAll(/(\w+)\s*([<|]+--[>|]+)\s*(\w+)/g)) {
    const from = idByLabel.get(match[1]);
    const to = idByLabel.get(match[3]);
    if (!from || !to) {
      continue;
    }
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: from,
      target: to,
      kind: "relation",
      matchConfidence: 1,
    });
  }

  return ir;
}

function parseGanttMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;

  for (const match of source.matchAll(/^\s*([^:\n]+)\s*:\s*(\w+)/gm)) {
    const label = match[1].trim();
    const id = match[2].trim();
    if (label.toLowerCase() === "section" || label.toLowerCase() === "title") {
      continue;
    }
    usedIds.add(id);
    ir.nodes.push({ id, label, kind: "task", matchConfidence: 1 });
    if (previousId) {
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: previousId,
        target: id,
        matchConfidence: 1,
      });
    }
    previousId = id;
  }

  for (const match of source.matchAll(/after\s+(\w+)/gi)) {
    const targetNode = ir.nodes.find((node) => node.id === match[1]);
    if (!targetNode || !previousId) {
      continue;
    }
    ir.edges.push({
      id: `e${ir.edges.length + 1}`,
      source: match[1],
      target: previousId,
      matchConfidence: 1,
    });
  }

  return ir;
}

export function parseSourceToIr(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const cleaned = stripSourceComments(source);
  const kind = classifyDiagramKind(cleaned, format);

  if (format === "graphml") {
    return graphmlToIr(cleaned, format);
  }

  if (format === "plantuml") {
    switch (kind) {
      case "class":
        return parseClassPlantUml(cleaned, format);
      case "state":
        return parseStatePlantUml(cleaned, format);
      case "sequence":
        return parseSequencePlantUml(cleaned, format);
      case "activity":
        return parseActivityPlantUml(cleaned, format);
      case "c4_context":
      case "c4_container":
        return parseC4PlantUml(cleaned, format);
      case "gantt":
        return parseGanttPlantUml(cleaned, format);
      case "er":
        return parseErPlantUml(cleaned, format);
      case "mindmap":
        return parseMindmapPlantUml(cleaned, format);
      case "usecase":
        return parseUsecasePlantUml(cleaned, format);
      case "deployment":
        return parseDeploymentPlantUml(cleaned, format);
      case "object":
        return parseObjectPlantUml(cleaned, format);
      case "timing":
        return parseTimingPlantUml(cleaned, format);
      case "wbs":
        return parseWbsPlantUml(cleaned, format);
      case "nwdiag":
        return parseNwdiagPlantUml(cleaned, format);
      case "archimate":
        return parseArchimatePlantUml(cleaned, format);
      case "graph":
      default:
        return parseComponentPlantUml(cleaned, format);
    }
  }

  switch (kind) {
    case "class":
      return parseClassMermaid(cleaned, format);
    case "state":
      return parseStateMermaid(cleaned, format);
    case "sequence":
      return parseSequenceMermaid(cleaned, format);
    case "er":
      return parseErMermaid(cleaned, format);
    case "gantt":
      return parseGanttMermaid(cleaned, format);
    case "activity":
      return parseActivityMermaid(cleaned, format);
    case "mindmap":
      return parseMindmapMermaid(cleaned, format);
    case "pie":
      return parsePieMermaid(cleaned, format);
    case "journey":
      return parseJourneyMermaid(cleaned, format);
    case "gitgraph":
      return parseGitgraphMermaid(cleaned, format);
    case "timeline":
      return parseTimelineMermaid(cleaned, format);
    case "sankey":
      return parseSankeyMermaid(cleaned, format);
    case "xychart":
      return parseXychartMermaid(cleaned, format);
    case "block":
      return parseBlockMermaid(cleaned, format);
    case "c4_context":
      return parseC4Mermaid(cleaned, format, "c4_context");
    case "c4_container":
      return parseC4Mermaid(cleaned, format, "c4_container");
    case "requirement":
      return parseRequirementMermaid(cleaned, format);
    case "quadrant":
      return parseQuadrantMermaid(cleaned, format);
    case "architecture":
      return parseArchitectureMermaid(cleaned, format);
    case "packet":
      return parsePacketMermaid(cleaned, format);
    case "graph":
    default:
      return parseFlowchartMermaid(cleaned, format);
  }
}

export function safeParseSourceToIr(
  source: string,
  format: DiagramFormat,
): { ir: DiagramIR | null; error: string | null } {
  try {
    return { ir: parseSourceToIr(source, format), error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "conversion.error.parseFailed";
    return { ir: null, error: message };
  }
}
