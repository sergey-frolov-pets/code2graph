import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";

function registerNode(
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

export function parseFlowchartMermaid(source: string, format: DiagramFormat): DiagramIR {
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
      registerNode(ir, match[1], match[2].trim(), usedIds, { kind });
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
      registerNode(ir, sourceId, sourceId, usedIds);
    }
    if (!ir.nodes.some((node) => node.id === targetId)) {
      registerNode(ir, targetId, targetId, usedIds);
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

export function parseActivityMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("activity");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;
  let edgeIndex = 0;

  for (const match of source.matchAll(/(\w+)\s*\[([^\]]+)\]/g)) {
    registerNode(ir, match[1], match[2].trim(), usedIds);
  }

  for (const match of source.matchAll(/(\w+)\s*-->\s*(\w+)/g)) {
    edgeIndex += 1;
    ir.edges.push({
      id: `e${edgeIndex}`,
      source: match[1],
      target: match[2],
      matchConfidence: 1,
    });
  }

  if (ir.edges.length === 0) {
    for (const match of source.matchAll(/(\w+)\s*\[([^\]]+)\]/g)) {
      const id = match[1];
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
  }

  return ir;
}

export function parseClassMermaid(source: string, format: DiagramFormat): DiagramIR {
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

export function parseStateMermaid(source: string, format: DiagramFormat): DiagramIR {
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

export function parseSequenceMermaid(source: string, format: DiagramFormat): DiagramIR {
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

export function parseErMermaid(source: string, format: DiagramFormat): DiagramIR {
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

export function parseGanttMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;

  for (const match of source.matchAll(/^\s*([^:\n]+)\s*:\s*(\w+)(?:,\s*([^,\n]+))?(?:,\s*(\dd))?/gm)) {
    const label = match[1].trim();
    const id = match[2].trim();
    if (label.toLowerCase() === "section" || label.toLowerCase() === "title") {
      continue;
    }

    usedIds.add(id);
    ir.nodes.push({
      id,
      label,
      kind: "task",
      semantic: {
        startDate: match[3]?.trim(),
        duration: match[4]?.trim(),
      },
      matchConfidence: 1,
    });

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
