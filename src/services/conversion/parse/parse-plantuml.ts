import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";

function registerAlias(
  aliasToId: Map<string, string>,
  alias: string,
  id: string,
): void {
  aliasToId.set(alias, id);
  aliasToId.set(alias.toLowerCase(), id);
}

export function parseComponentPlantUml(source: string, format: DiagramFormat): DiagramIR {
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
    registerAlias(aliasToId, id, id);
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
      registerAlias(aliasToId, alias, id);
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

export function parseClassPlantUml(source: string, format: DiagramFormat): DiagramIR {
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
  const classRelationPattern = /(\w+)\s+([<|*o.\-]+)\s+(\w+)/g;
  let edgeIndex = 0;
  for (const match of source.matchAll(classRelationPattern)) {
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

export function parseStatePlantUml(source: string, format: DiagramFormat): DiagramIR {
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

export function parseSequencePlantUml(source: string, format: DiagramFormat): DiagramIR {
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

  function ensureParticipant(name: string): string {
    const clean = name.replace(/"/g, "").trim();
    if (!clean) {
      return "";
    }

    const existing = idByLabel.get(clean);
    if (existing) {
      return existing;
    }

    const id = uniqueDiagramId(clean, usedIds);
    ir.nodes.push({
      id,
      label: clean,
      kind: "actor",
      matchConfidence: 0.8,
    });
    idByLabel.set(clean, id);
    return id;
  }

  let edgeIndex = 0;
  for (const match of source.matchAll(
    /(\S+)\s*(?:->>|->)\s*(\S+)\s*:\s*(.+)$/gm,
  )) {
    const sourceId = ensureParticipant(match[1]);
    const targetId = ensureParticipant(match[2]);
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

export function parseActivityPlantUml(source: string, format: DiagramFormat): DiagramIR {
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

export function parseC4PlantUml(source: string, format: DiagramFormat): DiagramIR {
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
      kind: type.startsWith("Person")
        ? "actor"
        : type.startsWith("Container")
          ? "container"
          : "system",
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

export function parseGanttPlantUml(source: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;

  for (const match of source.matchAll(/\[([^\]]+)\]\s+lasts\s+(\d+\s*\w+)/gi)) {
    const label = match[1].trim();
    const duration = match[2].trim();
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      kind: "task",
      semantic: { duration },
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

  return ir;
}
