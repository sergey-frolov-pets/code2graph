import type { DiagramFormat } from "@/constants/diagram-formats";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import {
  parseMermaidRequirementText,
  parseMermaidSankeyCsvLine,
} from "@/services/conversion/emit/mermaid-emit-utils";
import { addEdge, unquote } from "@/services/conversion/parse/kind-parser-utils";
import { parseMermaidGitRefToken } from "@/utils/mermaid-gitgraph";

export function parseMindmapMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("mindmap");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const wbsItems: Array<{ level: number; label: string }> = [];
  let rootId: string | null = null;

  for (const match of source.matchAll(
    /root\s*(?:\(\(([^)]+)\)\)|\(\[([^\]]+)\]\)|\[([^\]]+)\]|\(([^)]+)\))/gi,
  )) {
    const label = (match[1] || match[2] || match[3] || match[4] || "").trim();
    rootId = uniqueDiagramId(label, usedIds);
    ir.nodes.push({ id: rootId, label, matchConfidence: 1 });
    wbsItems.push({ level: 1, label });
  }

  const lines = source.split(/\r?\n/);
  const parentStack: Array<{ level: number; id: string }> = [];
  if (rootId) {
    parentStack.push({ level: 1, id: rootId });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^mindmap\b/i.test(trimmed) || /^root\b/i.test(trimmed)) {
      continue;
    }
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    const level = Math.max(2, Math.floor(indent / 2));
    const label = trimmed
      .replace(/^[\w-]+\s*(?:\(\(|\(\[|\[\[|\[|\()/, "")
      .replace(/(?:\)\)|\]\)|\]\]|\]|\))$/, "")
      .replace(/^[()[\]]+|[()[\]]+$/g, "")
      .trim();
    if (!label) {
      continue;
    }
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({ id, label, matchConfidence: 1 });
    wbsItems.push({ level, label });

    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].level >= level
    ) {
      parentStack.pop();
    }

    const parent = parentStack[parentStack.length - 1]?.id ?? rootId ?? ir.nodes[0]?.id;
    if (parent && parent !== id) {
      addEdge(ir, parent, id);
    }

    parentStack.push({ level, id });
  }

  ir.extras = { ...ir.extras, wbsItems };
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
    chartData.xLabels = xAxisMatch[1].split(",").map((item) => unquote(item.trim()));
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
    if (!trimmed || /^(block-beta|columns|end)\b/i.test(trimmed)) {
      continue;
    }
    const edgeMatch = trimmed.match(/^([\p{L}\p{N}_-]+)\s*-->\s*([\p{L}\p{N}_-]+)$/u);
    if (edgeMatch) {
      const from = ir.nodes.find((n) => n.id === edgeMatch[1] || n.label === edgeMatch[1])?.id;
      const to = ir.nodes.find((n) => n.id === edgeMatch[2] || n.label === edgeMatch[2])?.id;
      if (from && to) {
        addEdge(ir, from, to);
      }
      continue;
    }

    const quotedBlockMatch = trimmed.match(
      /^([\p{L}\p{N}_-]+)\s*\["?([^"\]]+)"?\]/u,
    );
    if (quotedBlockMatch) {
      const id = uniqueDiagramId(quotedBlockMatch[1], usedIds);
      ir.nodes.push({
        id,
        label: quotedBlockMatch[2].trim(),
        matchConfidence: 1,
      });
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

  if (ir.edges.length === 0 && ir.nodes.length > 1) {
    for (let i = 1; i < ir.nodes.length; i += 1) {
      addEdge(ir, ir.nodes[i - 1].id, ir.nodes[i].id);
    }
  }

  return ir;
}

export function parseC4Mermaid(
  source: string,
  format: DiagramFormat,
  kind: "c4_context" | "c4_container",
): DiagramIR {
  const ir = createEmptyDiagramIR(kind);
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const groups: DiagramGroup[] = [];
  const boundaryStack: string[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) {
      continue;
    }

    if (/^title\s+/i.test(line)) {
      ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      continue;
    }

    if (line === "}") {
      boundaryStack.pop();
      continue;
    }

    const boundaryMatch = line.match(
      /^(?:System_Boundary|Container_Boundary|Enterprise_Boundary|Boundary)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/i,
    );
    if (boundaryMatch) {
      const alias = boundaryMatch[1].trim();
      const label = boundaryMatch[2].trim() || alias;
      const groupId = uniqueDiagramId(alias, usedIds);
      groups.push({
        id: groupId,
        label,
        parentId: boundaryStack[boundaryStack.length - 1],
      });
      aliasToId.set(alias, groupId);
      boundaryStack.push(groupId);
      if (!ir.extras?.systemBoundary) {
        ir.extras = { ...ir.extras, systemBoundary: label };
      }
      continue;
    }

    const elementMatch = line.match(
      /\b(Person(?:_Ext)?|System(?:_Ext|Db|Queue)?|Container(?:Db|Queue|_Ext)?|Component(?:Db|Queue|_Ext)?)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?/i,
    );
    if (elementMatch) {
      const type = elementMatch[1];
      const alias = elementMatch[2].trim();
      const label = elementMatch[3] || alias;
      const third = elementMatch[4]?.trim() || "";
      const fourth = elementMatch[5]?.trim() || "";
      const hasTech =
        type.toLowerCase().startsWith("container") ||
        type.toLowerCase().startsWith("component");
      const id = uniqueDiagramId(alias, usedIds);
      aliasToId.set(alias, id);
      aliasToId.set(label, id);
      ir.nodes.push({
        id,
        label,
        kind: type.startsWith("Person")
          ? "actor"
          : hasTech
            ? "container"
            : "system",
        groupId: boundaryStack[boundaryStack.length - 1],
        semantic: {
          c4Type: type,
          technology: hasTech ? third || undefined : undefined,
          description: hasTech ? fourth || undefined : third || undefined,
        },
        matchConfidence: 1,
      });
      continue;
    }

    const relMatch = line.match(
      /\bRel(?:_\w+)?\s*\(\s*([^,]+)\s*,\s*([^,)]+)(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?/i,
    );
    if (relMatch) {
      const from = relMatch[1].trim();
      const to = relMatch[2].trim();
      const label = relMatch[3]?.trim();
      const technology = relMatch[4]?.trim();
      const sourceId =
        aliasToId.get(from) ??
        ir.nodes.find((node) => node.id === from || node.label === from)?.id;
      const targetId =
        aliasToId.get(to) ??
        ir.nodes.find((node) => node.id === to || node.label === to)?.id;
      if (sourceId && targetId) {
        addEdge(
          ir,
          sourceId,
          targetId,
          label || undefined,
          "arrow",
          technology ? { technology } : undefined,
        );
      }
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

export function parseRequirementMermaid(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("requirement");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const requirements: Array<{ id: string; numericId?: number; text: string }> = [];
  const elements: Array<{ id: string; type: string }> = [];

  for (const match of source.matchAll(/(?:functionalRequirement|interfaceRequirement|performanceRequirement|physicalRequirement|designConstraint|requirement)\s+([\p{L}\p{N}_-]+)\s*\{([^}]*)\}/giu)) {
    const id = match[1];
    const body = match[2];
    const textMatch = body.match(/text:\s*(.+)/i);
    const idMatch = body.match(/id:\s*(\d+)/i);
    const text = textMatch?.[1]
      ? parseMermaidRequirementText(textMatch[1])
      : id;
    requirements.push({ id, numericId: idMatch ? Number.parseInt(idMatch[1], 10) : undefined, text });
    ir.nodes.push({
      id: uniqueDiagramId(id, usedIds),
      label: text,
      kind: "default",
      semantic: { requirementId: id },
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(/element\s+([\p{L}\p{N}_-]+)\s*\{([^}]*)\}/giu)) {
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

  for (const match of source.matchAll(
    /([\p{L}\p{N}_-]+)\s*-\s*(satisfies|traces|contains|copies|derives|verifies|refines)\s*->\s*([\p{L}\p{N}_-]+)/giu,
  )) {
    const from = ir.nodes.find((node) => node.id === match[1] || node.semantic?.requirementId === match[1] || node.label === match[1])?.id;
    const to = ir.nodes.find((node) => node.id === match[3] || node.semantic?.requirementId === match[3])?.id;
    if (from && to) {
      addEdge(ir, from, to, match[2].toLowerCase(), "satisfies");
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
    ir.extras = { title: parseMermaidRequirementText(titleMatch[1]) };
  }

  const xAxisMatch = source.match(/x-axis\s+(.+?)\s*-->\s*(.+)$/im);
  const yAxisMatch = source.match(/y-axis\s+(.+?)\s*-->\s*(.+)$/im);
  if (xAxisMatch || yAxisMatch) {
    ir.extras = {
      ...ir.extras,
      quadrantAxes: {
        xFrom: xAxisMatch?.[1]?.trim(),
        xTo: xAxisMatch?.[2]?.trim(),
        yFrom: yAxisMatch?.[1]?.trim(),
        yTo: yAxisMatch?.[2]?.trim(),
      },
    };
  }

  for (const match of source.matchAll(/^\s*([^:]+):\s*\[([0-9.]+)\s*,\s*([0-9.]+)\]/gm)) {
    const label = parseMermaidRequirementText(match[1]);
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
  if (/[\p{L}\p{N}_-]+:B\s*(?:-->|--)\s*T:/iu.test(source)) {
    ir.direction = "TB";
  } else if (/[\p{L}\p{N}_-]+:T\s*(?:-->|--)\s*B:/iu.test(source)) {
    ir.direction = "BT";
  } else if (/[\p{L}\p{N}_-]+:L\s*(?:-->|--)\s*R:/iu.test(source)) {
    ir.direction = "RL";
  } else if (/[\p{L}\p{N}_-]+:R\s*(?:-->|--)\s*L:/iu.test(source)) {
    ir.direction = "LR";
  } else {
    ir.direction = detectDiagramDirection(source, format);
  }
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const architectureServices: Array<{ id: string; label: string; group?: string; icon?: string }> = [];

  for (const match of source.matchAll(/group\s+([\p{L}\p{N}_-]+)\(([^)]+)\)\[([^\]]+)\]/giu)) {
    ir.groups = ir.groups ?? [];
    ir.groups.push({ id: match[1], label: match[3] });
  }

  for (const match of source.matchAll(
    /service\s+([\p{L}\p{N}_-]+)\(([^)]+)\)\[([^\]]+)\](?:\s+in\s+([\p{L}\p{N}_-]+))?/giu,
  )) {
    const rawId = match[1];
    const icon = match[2];
    const label = match[3];
    const groupId = match[4]?.trim();
    const id = uniqueDiagramId(rawId, usedIds);
    architectureServices.push({ id, label, icon, group: groupId });
    ir.nodes.push({
      id,
      label,
      groupId,
      kind: "container",
      semantic: { icon },
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(
    /([\p{L}\p{N}_-]+):[LRBT]\s*(?:-->|--|<-->|<--)\s*(?:[LRBT]:)?([\p{L}\p{N}_-]+)(?::[LRBT])?/giu,
  )) {
    const from = ir.nodes.find((n) => n.id === match[1])?.id ?? match[1];
    const to = ir.nodes.find((n) => n.id === match[2])?.id ?? match[2];
    if (ir.nodes.some((n) => n.id === from) && ir.nodes.some((n) => n.id === to)) {
      addEdge(ir, from, to);
    }
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
