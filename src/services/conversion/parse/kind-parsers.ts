import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createEmptyDiagramIR,
  type DiagramEdge,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import { parseMermaidSankeyCsvLine } from "@/services/conversion/emit/mermaid-emit-utils";
import { parseMermaidGitRefToken } from "@/utils/mermaid-gitgraph";

function addEdge(
  ir: DiagramIR,
  source: string,
  target: string,
  label?: string,
  kind?: DiagramEdge["kind"],
): void {
  ir.edges.push({
    id: `e${ir.edges.length + 1}`,
    source,
    target,
    label,
    kind,
    matchConfidence: 1,
  });
}

export function parseErPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("er");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(/\bentity\s+(\w+)/gi)) {
    const label = match[1];
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  for (const match of source.matchAll(/(\w+)\s*[|o}{]+--[|o}{]+\s*(\w+)/g)) {
    const from = idByLabel.get(match[1]);
    const to = idByLabel.get(match[2]);
    if (from && to) {
      addEdge(ir, from, to, undefined, "relation");
    }
  }

  return ir;
}

export function parseUsecasePlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("usecase");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(/\bactor\s+(\S+)(?:\s+as\s+"([^"]+)")?/gi)) {
    const alias = match[1];
    const label = match[2]?.trim() || alias;
    ir.nodes.push({
      id: uniqueDiagramId(alias, usedIds),
      label,
      kind: "actor",
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(/\busecase\s+"([^"]+)"(?:\s+as\s+(\w+))?/gi)) {
    const label = match[1];
    const alias = match[2] || label;
    ir.nodes.push({
      id: uniqueDiagramId(alias, usedIds),
      label,
      kind: "usecase",
      matchConfidence: 1,
    });
  }

  const boundary = source.match(/rectangle\s+"([^"]+)"/i);
  if (boundary) {
    ir.extras = { ...ir.extras, systemBoundary: boundary[1] };
  }

  const idByAlias = new Map(ir.nodes.map((node) => [node.id, node.id]));
  for (const node of ir.nodes) {
    idByAlias.set(node.label, node.id);
  }

  for (const match of source.matchAll(/(\w+)\s*-->\s*(\w+)/g)) {
    const from = idByAlias.get(match[1]);
    const to = idByAlias.get(match[2]);
    if (from && to) {
      addEdge(ir, from, to);
    }
  }

  return ir;
}

export function parseDeploymentPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("deployment");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  for (const match of source.matchAll(/\b(?:node|frame|cloud)\s+"([^"]+)"/gi)) {
    const label = match[1];
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      kind: "container",
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(/\bdatabase\s+"([^"]+)"/gi)) {
    const label = match[1];
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      kind: "system",
      matchConfidence: 1,
    });
  }

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  for (const match of source.matchAll(/"([^"]+)"\s*-->\s*"([^"]+)"/g)) {
    const from = idByLabel.get(match[1]);
    const to = idByLabel.get(match[2]);
    if (from && to) {
      addEdge(ir, from, to);
    }
  }

  return ir;
}

export function parseObjectPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("object");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const objectFields: Record<string, Array<{ name: string; value: string }>> = {};

  for (const match of source.matchAll(/\bobject\s+(\w+)\s*\{([^}]*)\}/gi)) {
    const name = match[1];
    const id = uniqueDiagramId(name, usedIds);
    ir.nodes.push({ id, label: name, kind: "class", matchConfidence: 1 });
    const fields: Array<{ name: string; value: string }> = [];
    for (const fieldMatch of match[2].matchAll(/(\w+)\s*=\s*(\S+)/g)) {
      fields.push({ name: fieldMatch[1], value: fieldMatch[2] });
    }
    objectFields[id] = fields;
  }

  ir.extras = { ...ir.extras, objectFields };

  const idByLabel = new Map(ir.nodes.map((node) => [node.label, node.id]));
  for (const match of source.matchAll(/(\w+)\s*-->\s*(\w+)/g)) {
    const from = idByLabel.get(match[1]);
    const to = idByLabel.get(match[2]);
    if (from && to) {
      addEdge(ir, from, to);
    }
  }

  return ir;
}

export function parseTimingPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("timing");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const signals: Array<{ name: string; states: Array<{ time: number; state: string }> }> = [];

  for (const match of source.matchAll(/\b(?:concise|robust)\s+"([^"]+)"\s+as\s+(\w+)/gi)) {
    const label = match[1];
    const alias = match[2];
    ir.nodes.push({
      id: uniqueDiagramId(alias, usedIds),
      label,
      kind: "default",
      matchConfidence: 1,
    });
    signals.push({ name: alias, states: [] });
  }

  let currentTime = 0;
  for (const line of source.split(/\r?\n/)) {
    const timeMatch = line.match(/@(\d+)/);
    if (timeMatch) {
      currentTime = Number.parseInt(timeMatch[1], 10);
      continue;
    }
    const stateMatch = line.match(/(\w+)\s+is\s+(\S+)/i);
    if (stateMatch) {
      const signal = signals.find((item) => item.name === stateMatch[1]);
      signal?.states.push({ time: currentTime, state: stateMatch[2] });
    }
  }

  ir.extras = { ...ir.extras, timingSignals: signals };
  return ir;
}

export function parseWbsPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("wbs");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const wbsItems: Array<{ level: number; label: string }> = [];

  for (const match of source.matchAll(/^(\*+)\s+(.+)$/gm)) {
    const level = match[1].length;
    const label = match[2].trim();
    wbsItems.push({ level, label });
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      matchConfidence: 1,
    });
  }

  for (let index = 1; index < ir.nodes.length; index += 1) {
    addEdge(ir, ir.nodes[index - 1].id, ir.nodes[index].id);
  }

  ir.extras = { ...ir.extras, wbsItems };
  return ir;
}

export function parseNwdiagPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("nwdiag");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const networkNodes: Array<{ id: string; address?: string }> = [];

  for (const match of source.matchAll(/(\w+)\s*\[address\s*=\s*([^\]]+)\]/gi)) {
    const id = uniqueDiagramId(match[1], usedIds);
    const address = match[2].trim();
    ir.nodes.push({ id, label: match[1], matchConfidence: 1 });
    networkNodes.push({ id, address });
  }

  for (const match of source.matchAll(/(\w+)\s*--\s*(\w+)/g)) {
    const from = ir.nodes.find((node) => node.label === match[1])?.id;
    const to = ir.nodes.find((node) => node.label === match[2])?.id;
    if (from && to) {
      addEdge(ir, from, to);
    }
  }

  ir.extras = { ...ir.extras, networkNodes };
  return ir;
}

export function parseArchimatePlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("archimate");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const elementPattern =
    /\b(Business_Actor|Application_Component|Technology_Node|Business_Process)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/gi;
  for (const match of source.matchAll(elementPattern)) {
    const type = match[1];
    const alias = match[2].trim();
    const label = match[3] || alias;
    ir.nodes.push({
      id: uniqueDiagramId(alias, usedIds),
      label,
      semantic: { archimateType: type },
      matchConfidence: 1,
    });
  }

  const idByAlias = new Map(ir.nodes.map((node) => [node.id, node.id]));
  for (const match of source.matchAll(/\bRel\s*\(\s*([^,]+)\s*,\s*([^,]+)/gi)) {
    const from = idByAlias.get(match[1].trim());
    const to = idByAlias.get(match[2].trim());
    if (from && to) {
      addEdge(ir, from, to);
    }
  }

  return ir;
}

export function parseMindmapPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("mindmap");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const wbsItems: Array<{ level: number; label: string }> = [];

  for (const match of source.matchAll(/^(\*+)\s+(.+)$/gm)) {
    const level = match[1].length;
    const label = match[2].trim();
    wbsItems.push({ level, label });
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      matchConfidence: 1,
    });
  }

  for (let index = 1; index < ir.nodes.length; index += 1) {
    addEdge(ir, ir.nodes[0].id, ir.nodes[index].id);
  }

  ir.extras = { ...ir.extras, wbsItems };
  return ir;
}

export function parseMindmapMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("mindmap");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let rootId: string | null = null;

  for (const match of source.matchAll(/root\s*\(\(([^)]+)\)\)/gi)) {
    const label = match[1].trim();
    rootId = uniqueDiagramId(label, usedIds);
    ir.nodes.push({ id: rootId, label, matchConfidence: 1 });
  }

  const lines = source.split(/\r?\n/);
  const parentStack: Array<{ level: number; id: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("mindmap") || trimmed.startsWith("root")) {
      continue;
    }
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    const level = Math.max(1, Math.floor(indent / 2));
    const label = trimmed.replace(/^[()[\]]+|[()[\]]+$/g, "").trim();
    if (!label) {
      continue;
    }
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({ id, label, matchConfidence: 1 });

    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
      parentStack.pop();
    }

    const parent = parentStack[parentStack.length - 1]?.id ?? rootId;
    if (parent) {
      addEdge(ir, parent, id);
    }

    parentStack.push({ level, id });
  }

  return ir;
}

export function parsePieMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("pie");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const slices: Array<{ label: string; value: number }> = [];

  const titleMatch = source.match(/title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { title: titleMatch[1].trim() };
  }

  for (const match of source.matchAll(/"([^"]+)"\s*:\s*(\d+(?:\.\d+)?)/g)) {
    const label = match[1];
    const value = Number.parseFloat(match[2]);
    slices.push({ label, value });
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      kind: "slice",
      semantic: { value },
      matchConfidence: 1,
    });
  }

  ir.extras = { ...ir.extras, slices };
  return ir;
}

export function parseJourneyMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("journey");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const journeyTasks: Array<{ section?: string; action: string; score: number; actor: string }> = [];
  let currentSection: string | undefined;

  const titleMatch = source.match(/title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { title: titleMatch[1].trim() };
  }

  for (const line of source.split(/\r?\n/)) {
    const sectionMatch = line.match(/section\s+(.+)/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }
    const taskMatch = line.match(/^\s*(.+?):\s*(\d+)\s*:\s*(.+)$/);
    if (!taskMatch) {
      continue;
    }
    const action = taskMatch[1].trim();
    const score = Number.parseInt(taskMatch[2], 10);
    const actor = taskMatch[3].trim();
    journeyTasks.push({ section: currentSection, action, score, actor });
    const id = uniqueDiagramId(action, usedIds);
    ir.nodes.push({ id, label: action, kind: "task", matchConfidence: 1 });
    if (ir.nodes.length > 1) {
      addEdge(ir, ir.nodes[ir.nodes.length - 2].id, id);
    }
  }

  ir.extras = { ...ir.extras, journeyTasks };
  return ir;
}

export function parseGitgraphMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("gitgraph");
  ir.metadata = { sourceFormat: format };
  const gitActions: Array<{ type: "commit" | "branch" | "checkout" | "merge"; id?: string; branch?: string }> = [];

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("gitGraph")) {
      continue;
    }
    const commitMatch = trimmed.match(/^commit(?:\s+id:\s*"([^"]+)")?/i);
    if (commitMatch) {
      gitActions.push({ type: "commit", id: commitMatch[1] });
      const label = commitMatch[1] ?? `commit_${gitActions.length}`;
      ir.nodes.push({ id: `c${ir.nodes.length + 1}`, label, kind: "event", matchConfidence: 1 });
      continue;
    }
    const branchMatch = trimmed.match(/^branch\s+(.+)$/i);
    if (branchMatch) {
      gitActions.push({ type: "branch", branch: parseMermaidGitRefToken(branchMatch[1]) });
      continue;
    }
    const checkoutMatch = trimmed.match(/^checkout\s+(.+)$/i);
    if (checkoutMatch) {
      gitActions.push({ type: "checkout", branch: parseMermaidGitRefToken(checkoutMatch[1]) });
      continue;
    }
    const mergeMatch = trimmed.match(/^merge\s+(.+)$/i);
    if (mergeMatch) {
      gitActions.push({ type: "merge", branch: parseMermaidGitRefToken(mergeMatch[1]) });
    }
  }

  for (let index = 1; index < ir.nodes.length; index += 1) {
    addEdge(ir, ir.nodes[index - 1].id, ir.nodes[index].id);
  }

  ir.extras = { ...ir.extras, gitActions };
  return ir;
}

export function parseTimelineMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("timeline");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const timelineEvents: Array<{ date: string; event: string; section?: string }> = [];
  let currentSection: string | undefined;

  const titleMatch = source.match(/title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { title: titleMatch[1].trim() };
  }

  for (const line of source.split(/\r?\n/)) {
    const sectionMatch = line.match(/section\s+(.+)/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }
    const eventMatch = line.match(/^\s*([^:]+)\s*:\s*(.+)$/);
    if (!eventMatch || eventMatch[1].trim().toLowerCase() === "title") {
      continue;
    }
    const date = eventMatch[1].trim();
    const event = eventMatch[2].trim();
    timelineEvents.push({ date, event, section: currentSection });
    const id = uniqueDiagramId(event, usedIds);
    ir.nodes.push({ id, label: event, kind: "event", semantic: { date }, matchConfidence: 1 });
    if (ir.nodes.length > 1) {
      addEdge(ir, ir.nodes[ir.nodes.length - 2].id, id);
    }
  }

  ir.extras = { ...ir.extras, timelineEvents };
  return ir;
}

export function parseSankeyMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("sankey");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const sankeyFlows: Array<{ source: string; target: string; value: number }> = [];

  for (const line of source.split(/\r?\n/)) {
    const flow = parseMermaidSankeyCsvLine(line);
    if (!flow) {
      continue;
    }

    const { source: sourceLabel, target: targetLabel, value } = flow;
    sankeyFlows.push({ source: sourceLabel, target: targetLabel, value });

    const ensureNode = (label: string): string => {
      const existing = ir.nodes.find((node) => node.label === label);
      if (existing) {
        return existing.id;
      }
      const id = uniqueDiagramId(label, usedIds);
      ir.nodes.push({ id, label, matchConfidence: 1 });
      return id;
    };

    addEdge(ir, ensureNode(sourceLabel), ensureNode(targetLabel), String(value), "flow");
  }

  ir.extras = { ...ir.extras, sankeyFlows };
  return ir;
}

export function parseXychartMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("xychart");
  ir.metadata = { sourceFormat: format };
  const chartData: {
    xLabels: string[];
    yAxis?: string;
    yMin?: number;
    yMax?: number;
    bar?: number[];
    line?: number[];
  } = { xLabels: [] };

  const titleMatch = source.match(/title\s+"?([^"\n]+)"?/i);
  if (titleMatch) {
    ir.extras = { title: titleMatch[1].trim() };
  }

  const xAxisMatch = source.match(/x-axis\s*\[([^\]]+)\]/i);
  if (xAxisMatch) {
    chartData.xLabels = xAxisMatch[1].split(",").map((item) => item.trim());
    chartData.xLabels.forEach((label, index) => {
      ir.nodes.push({
        id: `x${index + 1}`,
        label,
        kind: "default",
        matchConfidence: 1,
      });
    });
  }

  const yAxisMatch = source.match(/y-axis\s+"?([^"]+)"?\s+(\d+)\s*-->\s*(\d+)/i);
  if (yAxisMatch) {
    chartData.yAxis = yAxisMatch[1].trim();
    chartData.yMin = Number.parseInt(yAxisMatch[2], 10);
    chartData.yMax = Number.parseInt(yAxisMatch[3], 10);
  }

  const barMatch = source.match(/\bbar\s*\[([^\]]+)\]/i);
  if (barMatch) {
    chartData.bar = barMatch[1].split(",").map((item) => Number.parseFloat(item.trim()));
  }

  const lineMatch = source.match(/\bline\s*\[([^\]]+)\]/i);
  if (lineMatch) {
    chartData.line = lineMatch[1].split(",").map((item) => Number.parseFloat(item.trim()));
  }

  ir.extras = { ...ir.extras, chartData };
  return ir;
}

export function parseBlockMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("block");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const columnsMatch = source.match(/columns\s+(\d+)/i);
  if (columnsMatch) {
    ir.extras = { blockColumns: Number.parseInt(columnsMatch[1], 10) };
  }

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^(block-beta|columns)\b/i.test(trimmed)) {
      continue;
    }
    for (const token of trimmed.split(/\s+/)) {
      const label = token.trim();
      if (!label || label.startsWith("block:")) {
        continue;
      }
      ir.nodes.push({
        id: uniqueDiagramId(label, usedIds),
        label,
        matchConfidence: 1,
      });
    }
  }

  return ir;
}

export function parseC4Mermaid(source: string, format: DiagramFormat, kind: "c4_context" | "c4_container"): DiagramIR {
  const ir = createEmptyDiagramIR(kind);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();

  const elementPattern =
    /\b(Person|System|System_Ext|Container|ContainerDb|ContainerQueue)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/gi;
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

  for (const match of source.matchAll(/\bRel\s*\(\s*([^,]+)\s*,\s*([^,]+)(?:\s*,\s*"([^"]*)")?/gi)) {
    const from = match[1].trim();
    const to = match[2].trim();
    const label = match[3]?.trim();
    const sourceId = ir.nodes.find((node) => node.id === from || node.label === from)?.id;
    const targetId = ir.nodes.find((node) => node.id === to || node.label === to)?.id;
    if (sourceId && targetId) {
      addEdge(ir, sourceId, targetId, label);
    }
  }

  return ir;
}

export function parseRequirementMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("requirement");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const requirements: Array<{ id: string; numericId?: number; text: string }> = [];
  const elements: Array<{ id: string; type: string }> = [];

  for (const match of source.matchAll(/requirement\s+(\w+)\s*\{([^}]*)\}/gi)) {
    const id = match[1];
    const body = match[2];
    const textMatch = body.match(/text:\s*(.+)/i);
    const idMatch = body.match(/id:\s*(\d+)/i);
    const text = textMatch?.[1]?.trim() ?? id;
    requirements.push({ id, numericId: idMatch ? Number.parseInt(idMatch[1], 10) : undefined, text });
    ir.nodes.push({
      id: uniqueDiagramId(id, usedIds),
      label: text,
      kind: "default",
      semantic: { requirementId: id },
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(/element\s+(\w+)\s*\{([^}]*)\}/gi)) {
    const id = match[1];
    const typeMatch = match[2].match(/type:\s*(\w+)/i);
    const type = typeMatch?.[1] ?? "component";
    elements.push({ id, type });
    ir.nodes.push({
      id: uniqueDiagramId(id, usedIds),
      label: id,
      kind: "container",
      semantic: { elementType: type },
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(/(\w+)\s*-\s*satisfies\s*->\s*(\w+)/gi)) {
    const from = ir.nodes.find((node) => node.id === match[1] || node.semantic?.requirementId === match[1] || node.label === match[1])?.id;
    const to = ir.nodes.find((node) => node.id === match[2] || node.semantic?.requirementId === match[2])?.id;
    if (from && to) {
      addEdge(ir, from, to, undefined, "satisfies");
    }
  }

  ir.extras = { ...ir.extras, requirements, elements };
  return ir;
}

export function parseQuadrantMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("quadrant");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const quadrantItems: Array<{ label: string; x: number; y: number }> = [];

  const titleMatch = source.match(/title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { title: titleMatch[1].trim() };
  }

  const xAxisMatch = source.match(/x-axis\s+(\S+)\s*-->\s*(\S+)/i);
  const yAxisMatch = source.match(/y-axis\s+(\S+)\s*-->\s*(\S+)/i);
  if (xAxisMatch || yAxisMatch) {
    ir.extras = {
      ...ir.extras,
      quadrantAxes: {
        xFrom: xAxisMatch?.[1],
        xTo: xAxisMatch?.[2],
        yFrom: yAxisMatch?.[1],
        yTo: yAxisMatch?.[2],
      },
    };
  }

  for (const match of source.matchAll(/^\s*([^:]+):\s*\[([0-9.]+)\s*,\s*([0-9.]+)\]/gm)) {
    const label = match[1].trim();
    const x = Number.parseFloat(match[2]);
    const y = Number.parseFloat(match[3]);
    quadrantItems.push({ label, x, y });
    ir.nodes.push({
      id: uniqueDiagramId(label, usedIds),
      label,
      semantic: { x, y },
      matchConfidence: 1,
    });
  }

  ir.extras = { ...ir.extras, quadrantItems };
  return ir;
}

export function parseArchitectureMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("architecture");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const architectureServices: Array<{ id: string; label: string; group?: string; icon?: string }> = [];

  for (const match of source.matchAll(/group\s+(\w+)\(([^)]+)\)\[([^\]]+)\]/gi)) {
    ir.groups = ir.groups ?? [];
    ir.groups.push({ id: match[1], label: match[3] });
  }

  for (const match of source.matchAll(/service\s+(\w+)\(([^)]+)\)\[([^\]]+)\]/gi)) {
    const id = match[1];
    const icon = match[2];
    const label = match[3];
    architectureServices.push({ id, label, icon });
    ir.nodes.push({
      id: uniqueDiagramId(id, usedIds),
      label,
      kind: "container",
      semantic: { icon },
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(/(\w+):[LRBT]\s*-->\s*(\w+):[LRBT]/gi)) {
    addEdge(ir, match[1], match[2]);
  }

  ir.extras = { ...ir.extras, architectureServices };
  return ir;
}

export function parsePacketMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("packet");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const packetFields: Array<{ start: number; end: number; label: string }> = [];

  const titleMatch = source.match(/title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { title: titleMatch[1].trim() };
  }

  for (const match of source.matchAll(/(\d+)\s*-\s*(\d+)\s*:\s*"([^"]+)"/g)) {
    const start = Number.parseInt(match[1], 10);
    const end = Number.parseInt(match[2], 10);
    const label = match[3];
    packetFields.push({ start, end, label });
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      kind: "field",
      semantic: { start, end },
      matchConfidence: 1,
    });
    if (ir.nodes.length > 1) {
      addEdge(ir, ir.nodes[ir.nodes.length - 2].id, id);
    }
  }

  ir.extras = { ...ir.extras, packetFields };
  return ir;
}

export function parseActivityMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("activity");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;

  const nodePatterns: Array<{ pattern: RegExp; kind: DiagramNode["kind"] }> = [
    { pattern: /(\w+)\s*\(\[([^\]]+)\]\)/g, kind: "start" },
    { pattern: /(\w+)\s*\[([^\]]+)\]/g, kind: "default" },
    { pattern: /(\w+)\s*\{([^}]+)\}/g, kind: "decision" },
  ];

  for (const { pattern, kind } of nodePatterns) {
    for (const match of source.matchAll(pattern)) {
      const id = match[1];
      if (ir.nodes.some((node) => node.id === id)) {
        continue;
      }
      usedIds.add(id);
      ir.nodes.push({ id, label: match[2].trim(), kind, matchConfidence: 1 });
    }
  }

  for (const match of source.matchAll(/(\w+)\s*(?:-->|---|-.->|==>)\s*(?:\|([^|]+)\|\s*)?(\w+)/g)) {
    if (!ir.nodes.some((node) => node.id === match[1])) {
      continue;
    }
    if (!ir.nodes.some((node) => node.id === match[3])) {
      continue;
    }
    addEdge(ir, match[1], match[3], match[2]?.trim());
    previousId = match[3];
  }

  if (ir.nodes.length > 0 && ir.edges.length === 0) {
    for (let index = 1; index < ir.nodes.length; index += 1) {
      addEdge(ir, ir.nodes[index - 1].id, ir.nodes[index].id);
    }
  }

  void previousId;
  return ir;
}
