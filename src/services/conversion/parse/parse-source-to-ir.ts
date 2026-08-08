import type { DiagramFormat } from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramEdge,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { stripSourceComments } from "@/services/conversion/parse/parse-utils";
import { parseGraphml } from "@/services/graphml/graphml-engine";

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

function parseComponentPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("graph");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const nodePattern = /\[([^\]]+)\]/g;
  for (const match of source.matchAll(nodePattern)) {
    const label = match[1].trim();
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      matchConfidence: 1,
    });
  }

  const labelToId = new Map(
    ir.nodes.map((node) => [node.label, node.id]),
  );

  const edgePattern =
    /\[([^\]]+)\]\s*(?:-[->]+)\s*(?:\|([^|]+)\|\s*)?\[([^\]]+)\]/g;
  let edgeIndex = 0;
  for (const match of source.matchAll(edgePattern)) {
    const from = match[1].trim();
    const to = match[3].trim();
    const label = match[2]?.trim();
    const sourceId = labelToId.get(from);
    const targetId = labelToId.get(to);
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

function parseSequencePlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("sequence");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const participantPattern =
    /\b(?:actor|participant|boundary|control|entity|database|queue|collections)\s+(?:"([^"]+)"|(\S+))/gi;
  for (const match of source.matchAll(participantPattern)) {
    const label = (match[1] || match[2]).trim();
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      kind: "actor",
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  const aliasPattern =
    /\b(?:actor|participant)\s+(\S+)\s+as\s+"([^"]+)"/gi;
  for (const match of source.matchAll(aliasPattern)) {
    const alias = match[1];
    const label = match[2];
    const node = ir.nodes.find((item) => item.label === label);
    if (node) {
      idByLabel.set(alias, node.id);
    }
  }

  let edgeIndex = 0;
  for (const match of source.matchAll(
    /(\S+)\s*(?:->>|->)\s*(\S+)\s*:\s*(.+)$/gm,
  )) {
    const sourceId = idByLabel.get(match[1]) ?? idByLabel.get(match[1].replace(/"/g, ""));
    const targetId = idByLabel.get(match[2]) ?? idByLabel.get(match[2].replace(/"/g, ""));
    if (!sourceId || !targetId) {
      continue;
    }
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: sourceId,
      target: targetId,
      label: match[3].trim(),
      kind: "message",
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

function parseFlowchartMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("graph");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const nodePatterns: Array<{
    pattern: RegExp;
    kind: DiagramNode["kind"];
  }> = [
    { pattern: /(\w+)\s*\(\[([^\]]+)\]\)/g, kind: "default" },
    { pattern: /(\w+)\s*\(\(([^)]+)\)\)/g, kind: "default" },
    { pattern: /(\w+)\s*\[\[([^\]]+)\]\]/g, kind: "default" },
    { pattern: /(\w+)\s*\[(?!\[)([^\]]+)\]/g, kind: "default" },
    { pattern: /(\w+)\s*\((?!\[)([^)]+)\)/g, kind: "default" },
    { pattern: /(\w+)\s*\{([^}]+)\}/g, kind: "decision" },
  ];

  for (const { pattern, kind } of nodePatterns) {
    for (const match of source.matchAll(pattern)) {
      const id = match[1];
      const label = match[2].trim();
      if (ir.nodes.some((node) => node.id === id)) {
        continue;
      }
      usedIds.add(id);
      ir.nodes.push({
        id,
        label,
        kind,
        matchConfidence: 1,
      });
    }
  }

  let edgeIndex = 0;
  for (const match of source.matchAll(
    /(\w+)\s*(?:-->|---|-.->|==>)\s*(?:\|([^|]+)\|\s*)?(\w+)/g,
  )) {
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: match[1],
      target: match[3],
      label: match[2]?.trim(),
      matchConfidence: 1,
    });
  }

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

function parseStateMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("state");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(/\b(\w+)\s*:/g)) {
    const label = match[1];
    if (label === "stateDiagram" || label === "stateDiagram-v2") {
      continue;
    }
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  let edgeIndex = 0;
  for (const match of source.matchAll(/(\w+)\s*-->\s*(\w+)/g)) {
    const from = idByLabel.get(match[1]);
    const to = idByLabel.get(match[2]);
    if (!from || !to) {
      continue;
    }
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: from,
      target: to,
      matchConfidence: 1,
    });
  }

  return ir;
}

function parseSequenceMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("sequence");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(
    /\b(?:participant|actor)\s+(\w+)(?:\s+as\s+"([^"]+)")?/gi,
  )) {
    const alias = match[1];
    const label = match[2]?.trim() || alias;
    ir.nodes.push({
      id: uniqueDiagramId(alias, usedIds),
      label,
      kind: "actor",
      matchConfidence: 1,
    });
  }

  const idByAlias = new Map(ir.nodes.map((node) => [node.id, node.id]));
  let edgeIndex = 0;
  for (const match of source.matchAll(/(\w+)\s*-+>>?\s*(\w+)\s*:\s*(.+)$/gm)) {
    const sourceId = idByAlias.get(match[1]);
    const targetId = idByAlias.get(match[2]);
    if (!sourceId || !targetId) {
      continue;
    }
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: sourceId,
      target: targetId,
      label: match[3].trim(),
      kind: "message",
      matchConfidence: 1,
    });
  }

  return ir;
}

function parseErMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("er");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(/\b(\w+)\s*\{/g)) {
    const label = match[1];
    if (label === "erDiagram") {
      continue;
    }
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  let edgeIndex = 0;
  for (const match of source.matchAll(/(\w+)\s*[|o}{]+--[|o}{]+\s*(\w+)/g)) {
    const from = idByLabel.get(match[1]);
    const to = idByLabel.get(match[2]);
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
      return parseActivityPlantUml(cleaned, format);
    case "graph":
    default:
      return parseFlowchartMermaid(cleaned, format);
  }
}
