import type { DiagramFormat } from "@/constants/diagram-formats";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramEntityAttribute,
  type DiagramIR,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { addEdge, unquote } from "@/services/conversion/parse/kind-parser-utils";
import { parseComponentPlantUml } from "@/services/conversion/parse/parse-plantuml-structural";

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
      /^(?::([^:]+):|\(([^)]+)\)|"([^"]+)"|([\p{L}\p{N}_-]+))\s*(-->|<--|\.\.>|<-\.+|--|-[-\w]*>+|\.[.\w]*>+)\s*(?::([^:]+):|\(([^)]+)\)|"([^"]+)"|([\p{L}\p{N}_-]+))(?:\s*:\s*(.+))?$/u,
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
  const ir = parseComponentPlantUml(source, format);
  ir.kind = "deployment";
  const usedIds = new Set(ir.nodes.map((n) => n.id));
  for (const grp of ir.groups ?? []) {
    usedIds.add(grp.id);
  }

  for (const match of source.matchAll(
    /\bDeployment_Node\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/gi,
  )) {
    const alias = match[1].trim();
    const label = match[2].trim() || alias;
    if (!ir.nodes.some((n) => n.id === alias || n.label === label)) {
      ir.nodes.push({
        id: uniqueDiagramId(alias || label, usedIds),
        label,
        kind: "container",
        matchConfidence: 1,
      });
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
    /([\p{L}\p{N}_-]+)\s*(?:-->|\*--|o--|--|-[-\w]*>+)\s*([\p{L}\p{N}_-]+)(?:\s*:\s*(.+))?$/gmu,
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
