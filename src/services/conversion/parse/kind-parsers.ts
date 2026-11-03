import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createEmptyDiagramIR,
  type DiagramEdge,
  type DiagramEntityAttribute,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  parseMermaidRequirementText,
  parseMermaidSankeyCsvLine,
} from "@/services/conversion/emit/mermaid-emit-utils";
import { parseMermaidGitRefToken } from "@/utils/mermaid-gitgraph";

function addEdge(
  ir: DiagramIR,
  source: string,
  target: string,
  label?: string,
  kind?: DiagramEdge["kind"],
  semantic?: Record<string, unknown>,
): void {
  ir.edges.push({
    id: `e${ir.edges.length + 1}`,
    source,
    target,
    label,
    kind,
    semantic,
    matchConfidence: 1,
  });
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').trim();
  }
  return trimmed;
}

export function parseErPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("er");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByLabel = new Map<string, string>();
  const entityAttributes: Record<string, DiagramEntityAttribute[]> = {};

  function ensureEntity(rawName: string, explicitLabel?: string): string {
    const clean = unquote(rawName);
    const existing = idByLabel.get(clean);
    if (existing) {
      if (explicitLabel) {
        const node = ir.nodes.find((entry) => entry.id === existing);
        if (node) {
          node.label = explicitLabel;
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(clean, usedIds);
    const label = explicitLabel || clean;
    idByLabel.set(clean, id);
    idByLabel.set(label, id);
    idByLabel.set(id, id);
    ir.nodes.push({
      id,
      label,
      matchConfidence: 1,
    });
    entityAttributes[id] = entityAttributes[id] ?? [];
    return id;
  }

  let currentEntityId: string | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line) || /^!pragma/i.test(line)) {
      continue;
    }

    if (line === "}") {
      currentEntityId = null;
      continue;
    }

    const entityMatch = line.match(
      /^entity\s+(?:"([^"]+)"|([\p{L}\p{N}_-]+))(?:\s+as\s+([\p{L}\p{N}_-]+))?\s*(\{)?$/iu,
    );
    if (entityMatch) {
      const label = (entityMatch[1] || entityMatch[2] || "").trim();
      const alias = entityMatch[3]?.trim() || label;
      const id = ensureEntity(alias, label);
      idByLabel.set(label, id);
      if (entityMatch[4]) {
        currentEntityId = id;
      }
      continue;
    }

    if (currentEntityId) {
      if (/^--+$/.test(line)) {
        continue;
      }
      const fieldMatch = line.match(
        /^(\*|\+)?\s*([\p{L}\p{N}_-]+)\s*:\s*([\p{L}\p{N}_<>[\]-]+)(?:\s*<<\s*(PK|FK)\s*>>)?/iu,
      );
      if (fieldMatch) {
        const isPrimaryKey =
          Boolean(fieldMatch[1]) || fieldMatch[4]?.toUpperCase() === "PK";
        const isForeignKey = fieldMatch[4]?.toUpperCase() === "FK";
        entityAttributes[currentEntityId] = entityAttributes[currentEntityId] ?? [];
        entityAttributes[currentEntityId].push({
          name: fieldMatch[2].trim(),
          type: fieldMatch[3].trim(),
          isPrimaryKey,
          isForeignKey,
        });
      }
      continue;
    }

    const relMatch = line.match(
      /^([\p{L}\p{N}_"-]+)\s*([|o}{]+(?:--|\.\.)[|o}{]+)\s*([\p{L}\p{N}_"-]+)(?:\s*:\s*(.+))?$/u,
    );
    if (relMatch) {
      const from = ensureEntity(relMatch[1]);
      const cardinality = relMatch[2].trim();
      const to = ensureEntity(relMatch[3]);
      const label = relMatch[4] ? unquote(relMatch[4]) : undefined;
      addEdge(ir, from, to, label, "relation", { cardinality });
    }
  }

  ir.extras = { ...ir.extras, entityAttributes };
  return ir;
}

export function parseUsecasePlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("usecase");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByAlias = new Map<string, string>();

  function registerRef(ref: string, id: string): void {
    const clean = unquote(ref.replace(/^\(|\)$/g, "").replace(/^:|:$/g, ""));
    if (clean) {
      idByAlias.set(clean, id);
      idByAlias.set(clean.toLowerCase(), id);
    }
  }

  for (const match of source.matchAll(
    /\bactor\s+(?:"([^"]+)"|:([^:]+):|([\p{L}\p{N}_-]+))(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_-]+)))?/giu,
  )) {
    const first = (match[1] || match[2] || match[3] || "").trim();
    const second = (match[4] || match[5] || "").trim();
    const quotedSecond = Boolean(match[4]);
    const label = quotedSecond ? second : first;
    const alias = quotedSecond ? first : second || first;
    const id = uniqueDiagramId(alias, usedIds);
    ir.nodes.push({
      id,
      label,
      kind: "actor",
      matchConfidence: 1,
    });
    registerRef(first, id);
    if (second) {
      registerRef(second, id);
    }
  }

  for (const match of source.matchAll(
    /\busecase\s+(?:"([^"]+)"|\(([^)]+)\)|([\p{L}\p{N}_-]+))(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_-]+)))?/giu,
  )) {
    const first = (match[1] || match[2] || match[3] || "").trim();
    const second = (match[4] || match[5] || "").trim();
    const quotedSecond = Boolean(match[4]);
    const label = quotedSecond ? second : first;
    const alias = quotedSecond ? first : second || first;
    const id = uniqueDiagramId(alias, usedIds);
    ir.nodes.push({
      id,
      label,
      kind: "usecase",
      matchConfidence: 1,
    });
    registerRef(first, id);
    if (second) {
      registerRef(second, id);
    }
  }

  const boundary = source.match(/(?:rectangle|package)\s+"([^"]+)"/i);
  if (boundary) {
    ir.extras = { ...ir.extras, systemBoundary: boundary[1] };
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const relMatch = line.match(
      /^(?::([^:]+):|\(([^)]+)\)|"([^"]+)"|([\p{L}\p{N}_-]+))\s*(-->|<--|\.\.>|<-\.+|--)\s*(?::([^:]+):|\(([^)]+)\)|"([^"]+)"|([\p{L}\p{N}_-]+))(?:\s*:\s*(.+))?$/u,
    );
    if (!relMatch) {
      continue;
    }

    const leftActor = relMatch[1];
    const leftUc = relMatch[2];
    const leftRaw = (leftActor || leftUc || relMatch[3] || relMatch[4] || "").trim();
    const arrow = relMatch[5];
    const rightActor = relMatch[6];
    const rightUc = relMatch[7];
    const rightRaw = (rightActor || rightUc || relMatch[8] || relMatch[9] || "").trim();
    const label = relMatch[10]?.trim();

    const ensureEndpoint = (raw: string, isActor: boolean, isUc: boolean): string => {
      const existing = idByAlias.get(raw) ?? idByAlias.get(raw.toLowerCase());
      if (existing) {
        return existing;
      }
      const id = uniqueDiagramId(raw, usedIds);
      ir.nodes.push({
        id,
        label: raw,
        kind: isActor ? "actor" : isUc ? "usecase" : "usecase",
        matchConfidence: 0.9,
      });
      registerRef(raw, id);
      return id;
    };

    const leftId = ensureEndpoint(leftRaw, Boolean(leftActor), Boolean(leftUc));
    const rightId = ensureEndpoint(rightRaw, Boolean(rightActor), Boolean(rightUc));
    const isReverse = arrow.startsWith("<");
    addEdge(
      ir,
      isReverse ? rightId : leftId,
      isReverse ? leftId : rightId,
      label ? unquote(label) : undefined,
      arrow.includes(".") ? "dashed" : "arrow",
    );
  }

  return ir;
}

export function parseDeploymentPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("deployment");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByRef = new Map<string, string>();

  function registerNode(
    label: string,
    alias: string,
    kind: DiagramNode["kind"],
  ): string {
    const existing = idByRef.get(alias) ?? idByRef.get(label);
    if (existing) {
      return existing;
    }
    const id = uniqueDiagramId(alias || label, usedIds);
    idByRef.set(alias, id);
    idByRef.set(label, id);
    idByRef.set(id, id);
    ir.nodes.push({
      id,
      label,
      kind,
      matchConfidence: 1,
    });
    return id;
  }

  for (const match of source.matchAll(
    /\b(node|frame|cloud|database|storage|artifact|component)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+([\p{L}\p{N}_-]+))?/giu,
  )) {
    const kw = match[1].toLowerCase();
    const label = (match[2] || match[3] || "").trim();
    const alias = match[4]?.trim() || label;
    const kind: DiagramNode["kind"] =
      kw === "database" || kw === "storage"
        ? "system"
        : kw === "artifact"
          ? "artifact"
          : "container";
    registerNode(label, alias, kind);
  }

  for (const match of source.matchAll(
    /\bDeployment_Node\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/gi,
  )) {
    const alias = match[1].trim();
    const label = match[2].trim() || alias;
    registerNode(label, alias, "container");
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const edgeMatch = line.match(
      /^(?:"([^"]+)"|([\p{L}\p{N}_.-]+))\s*(-->|\.\.>|--)\s*(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s*:\s*(.+))?$/u,
    );
    if (edgeMatch) {
      const fromKey = (edgeMatch[1] || edgeMatch[2] || "").trim();
      const toKey = (edgeMatch[4] || edgeMatch[5] || "").trim();
      const label = edgeMatch[6]?.trim();
      const from = idByRef.get(fromKey) ?? registerNode(fromKey, fromKey, "container");
      const to = idByRef.get(toKey) ?? registerNode(toKey, toKey, "container");
      if (from && to) {
        addEdge(ir, from, to, label ? unquote(label) : undefined);
      }
    }
  }

  return ir;
}

export function parseObjectPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("object");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByRef = new Map<string, string>();
  const objectFields: Record<string, Array<{ name: string; value: string }>> = {};

  for (const match of source.matchAll(
    /\bobject\s+(?:"([^"]+)"|([\p{L}\p{N}_-]+))(?:\s+as\s+([\p{L}\p{N}_-]+))?(?:\s*\{([^}]*)\})?/giu,
  )) {
    const label = (match[1] || match[2] || "").trim();
    const alias = match[3]?.trim() || label;
    const body = match[4] ?? "";
    const id = uniqueDiagramId(alias, usedIds);
    idByRef.set(alias, id);
    idByRef.set(label, id);
    idByRef.set(id, id);
    ir.nodes.push({ id, label, kind: "class", matchConfidence: 1 });
    const fields: Array<{ name: string; value: string }> = [];
    for (const fieldMatch of body.matchAll(/([\p{L}\p{N}_-]+)\s*=\s*([^\r\n]+)/gu)) {
      fields.push({
        name: fieldMatch[1].trim(),
        value: fieldMatch[2].trim(),
      });
    }
    objectFields[id] = fields;
  }

  for (const match of source.matchAll(
    /([\p{L}\p{N}_-]+)\s*:\s*([\p{L}\p{N}_-]+)\s*=\s*([^\r\n]+)/gu,
  )) {
    const objId = idByRef.get(match[1].trim());
    if (objId) {
      objectFields[objId] = objectFields[objId] ?? [];
      objectFields[objId].push({
        name: match[2].trim(),
        value: match[3].trim(),
      });
    }
  }

  ir.extras = { ...ir.extras, objectFields };

  for (const match of source.matchAll(
    /([\p{L}\p{N}_-]+)\s*(?:-->|\*--|o--|--)\s*([\p{L}\p{N}_-]+)(?:\s*:\s*(.+))?$/gmu,
  )) {
    const from = idByRef.get(match[1]);
    const to = idByRef.get(match[2]);
    if (from && to) {
      addEdge(ir, from, to, match[3]?.trim());
    }
  }

  return ir;
}

export function parseTimingPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("timing");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const signals: Array<{ name: string; states: Array<{ time: number; state: string }> }> = [];

  for (const match of source.matchAll(
    /\b(?:concise|robust|clock|binary)\s+"([^"]+)"\s+as\s+([\p{L}\p{N}_-]+)/giu,
  )) {
    const label = match[1].trim();
    const alias = match[2].trim();
    const id = uniqueDiagramId(alias, usedIds);
    ir.nodes.push({
      id,
      label,
      kind: "default",
      matchConfidence: 1,
    });
    signals.push({ name: id, states: [] });
  }

  let currentTime = 0;
  for (const line of source.split(/\r?\n/)) {
    const timeMatch = line.match(/@(\d+)/);
    if (timeMatch) {
      currentTime = Number.parseInt(timeMatch[1], 10);
      continue;
    }
    const stateMatch = line.match(/([\p{L}\p{N}_-]+)\s+is\s+(\S+)/iu);
    if (stateMatch) {
      const signal =
        signals.find((item) => item.name === stateMatch[1]) ??
        signals.find(
          (item) =>
            ir.nodes.find((n) => n.id === item.name)?.label === stateMatch[1],
        );
      signal?.states.push({ time: currentTime, state: stateMatch[2] });
    }
  }

  for (let i = 1; i < ir.nodes.length; i += 1) {
    addEdge(ir, ir.nodes[i - 1].id, ir.nodes[i].id);
  }

  ir.extras = { ...ir.extras, timingSignals: signals };
  return ir;
}

function cleanHierarchyLabel(raw: string): string {
  return raw
    .replace(/^\[#[^\]]+\]/, "")
    .replace(/^_?\s*:\s*/, "")
    .replace(/;\s*$/, "")
    .trim();
}

export function parseWbsPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("wbs");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const wbsItems: Array<{ level: number; label: string }> = [];
  const parentStack: Array<{ level: number; id: string }> = [];

  for (const match of source.matchAll(/^\s*([*+-]+)\s+(.+)$/gm)) {
    const level = match[1].length;
    const label = cleanHierarchyLabel(match[2]);
    if (!label) {
      continue;
    }
    wbsItems.push({ level, label });
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      matchConfidence: 1,
    });

    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].level >= level
    ) {
      parentStack.pop();
    }

    const parent = parentStack[parentStack.length - 1]?.id ?? ir.nodes[0]?.id;
    if (parent && parent !== id) {
      addEdge(ir, parent, id);
    }

    parentStack.push({ level, id });
  }

  ir.extras = { ...ir.extras, wbsItems };
  return ir;
}

export function parseNwdiagPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("nwdiag");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const networkNodes: Array<{ id: string; address?: string }> = [];

  for (const match of source.matchAll(
    /([\p{L}\p{N}_-]+)\s*\[\s*address\s*=\s*["']?([^\]"']+)["']?\s*\]/giu,
  )) {
    const label = match[1].trim();
    const address = match[2].trim();
    const existing = ir.nodes.find((node) => node.label === label);
    const id = existing ? existing.id : uniqueDiagramId(label, usedIds);
    if (!existing) {
      ir.nodes.push({ id, label, matchConfidence: 1 });
    }
    networkNodes.push({ id, address });
  }

  for (const match of source.matchAll(/([\p{L}\p{N}_-]+)\s*--\s*([\p{L}\p{N}_-]+)/gu)) {
    const ensure = (name: string): string => {
      const found = ir.nodes.find((node) => node.label === name || node.id === name);
      if (found) {
        return found.id;
      }
      const id = uniqueDiagramId(name, usedIds);
      ir.nodes.push({ id, label: name, matchConfidence: 1 });
      networkNodes.push({ id });
      return id;
    };
    const from = ensure(match[1]);
    const to = ensure(match[2]);
    if (from && to) {
      addEdge(ir, from, to);
    }
  }

  if (ir.edges.length === 0 && ir.nodes.length > 1) {
    for (let i = 1; i < ir.nodes.length; i += 1) {
      addEdge(ir, ir.nodes[i - 1].id, ir.nodes[i].id);
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
  const idByAlias = new Map<string, string>();

  const elementPattern =
    /\b(Business_Actor|Business_Process|Business_Service|Application_Component|Application_Service|Technology_Node|Technology_Service)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/gi;
  for (const match of source.matchAll(elementPattern)) {
    const type = match[1];
    const alias = match[2].trim();
    const label = match[3] || alias;
    const id = uniqueDiagramId(alias, usedIds);
    idByAlias.set(alias, id);
    idByAlias.set(id, id);
    ir.nodes.push({
      id,
      label,
      semantic: { archimateType: type },
      matchConfidence: 1,
    });
  }

  for (const match of source.matchAll(
    /\bRel(?:_\w+)?\s*\(\s*([^,]+)\s*,\s*([^,)]+)(?:\s*,\s*"([^"]*)")?/gi,
  )) {
    const from = idByAlias.get(match[1].trim());
    const to = idByAlias.get(match[2].trim());
    const label = match[3]?.trim();
    if (from && to) {
      addEdge(ir, from, to, label || undefined);
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
  const parentStack: Array<{ level: number; id: string }> = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (
      !line ||
      /^@start/i.test(line) ||
      /^@end/i.test(line) ||
      /^(?:title|header|footer|caption|legend|endlegend|left\s+side|right\s+side)\b/i.test(
        line,
      )
    ) {
      if (/^title\s+/i.test(line)) {
        ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      }
      continue;
    }

    const match = line.match(/^([*+-]+)(?:\[#[^\]]+\])?_?\s*:?\s*(.+)$/);
    if (!match) {
      continue;
    }

    const level = match[1].length;
    const label = cleanHierarchyLabel(match[2]);
    if (!label) {
      continue;
    }

    wbsItems.push({ level, label });
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      matchConfidence: 1,
    });

    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1].level >= level
    ) {
      parentStack.pop();
    }

    const parent = parentStack[parentStack.length - 1]?.id ?? ir.nodes[0]?.id;
    if (parent && parent !== id) {
      addEdge(ir, parent, id);
    }

    parentStack.push({ level, id });
  }

  ir.extras = { ...ir.extras, wbsItems };
  return ir;
}

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
