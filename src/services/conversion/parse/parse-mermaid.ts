import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createEmptyDiagramIR,
  type DiagramClassMember,
  type DiagramEntityAttribute,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";

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

const FLOWCHART_RESERVED_WORDS = new Set([
  "flowchart",
  "graph",
  "subgraph",
  "end",
  "direction",
  "classdef",
  "class",
  "style",
  "linkstyle",
  "click",
  "tb",
  "td",
  "bt",
  "rl",
  "lr",
]);

function registerNode(
  ir: DiagramIR,
  id: string,
  label: string,
  usedIds: Set<string>,
  options?: Partial<DiagramNode>,
): void {
  const cleanLabel = unquote(label);
  const existing = ir.nodes.find((node) => node.id === id);
  if (existing) {
    if (existing.label === existing.id && cleanLabel && cleanLabel !== id) {
      existing.label = cleanLabel;
    }
    if (options?.kind && (!existing.kind || existing.kind === "default")) {
      existing.kind = options.kind;
    }
    if (options?.groupId && !existing.groupId) {
      existing.groupId = options.groupId;
    }
    return;
  }

  usedIds.add(id);
  ir.nodes.push({
    id,
    label: cleanLabel || id,
    matchConfidence: 1,
    ...options,
  });
}

function stripShapeModifiersFromEndpoint(raw: string): {
  id: string;
  label?: string;
  kind?: DiagramNode["kind"];
} {
  const token = raw.trim();
  const shapePatterns: Array<{
    regex: RegExp;
    kind: DiagramNode["kind"];
  }> = [
    { regex: /^([\p{L}\p{N}_-]+)\s*\(\[([^\]]+)\]\)$/u, kind: "start" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\(\(([^)]+)\)\)$/u, kind: "default" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\[\(([^)]+)\)\]$/u, kind: "system" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\[\[([^\]]+)\]\]$/u, kind: "container" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\{\{([^}]+)\}\}$/u, kind: "decision" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\{([^}]+)\}$/u, kind: "decision" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\[([^\]]+)\]$/u, kind: "default" },
    { regex: /^([\p{L}\p{N}_-]+)\s*\(([^)]+)\)$/u, kind: "default" },
  ];

  for (const { regex, kind } of shapePatterns) {
    const match = token.match(regex);
    if (match) {
      return {
        id: match[1].trim(),
        label: unquote(match[2]),
        kind,
      };
    }
  }

  const bareMatch = token.match(/^([\p{L}\p{N}_-]+)/u);
  return {
    id: bareMatch?.[1] ?? token,
  };
}

export function parseFlowchartMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("graph");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const groups: DiagramGroup[] = [];
  const groupStack: string[] = [];

  const nodePatterns: Array<{
    pattern: RegExp;
    kind: DiagramNode["kind"];
  }> = [
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\(\[([^\]]+)\]\)/gu, kind: "default" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\(\(([^)]+)\)\)/gu, kind: "default" },
    { pattern: /\b([\p{L}\p{N}_-]+)\[\(([^)]+)\)\]/gu, kind: "system" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\[([^\]]+)\]\]/gu, kind: "container" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\{\{([^}]+)\}\}/gu, kind: "decision" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[(?!\[|\()([^\]]+)\]/gu, kind: "default" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\((?!\[|\()([^)]+)\)/gu, kind: "default" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\{(?!\{)([^}]+)\}/gu, kind: "decision" },
  ];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) {
      continue;
    }

    if (/^(?:flowchart|graph)\b/i.test(line)) {
      continue;
    }

    if (/^(?:classDef|class|style|linkStyle|click|direction)\b/i.test(line)) {
      continue;
    }

    if (/^[\p{L}\p{N}_-]+@\{/u.test(line)) {
      continue;
    }

    const subgraphMatch = line.match(
      /^subgraph\s+([^\][\n]+?)(?:\s*\[([^\]]+)\])?\s*$/i,
    );
    if (subgraphMatch) {
      const rawId = unquote(subgraphMatch[1].trim());
      const rawLabel = subgraphMatch[2] ? unquote(subgraphMatch[2]) : rawId;
      const groupId = uniqueDiagramId(rawId, usedIds);
      groups.push({
        id: groupId,
        label: rawLabel,
        parentId: groupStack[groupStack.length - 1],
      });
      groupStack.push(groupId);
      continue;
    }

    if (/^end\s*$/i.test(line)) {
      groupStack.pop();
      continue;
    }

    const currentGroup = groupStack[groupStack.length - 1];

    for (const { pattern, kind } of nodePatterns) {
      for (const match of line.matchAll(pattern)) {
        const id = match[1].trim();
        if (FLOWCHART_RESERVED_WORDS.has(id.toLowerCase())) {
          continue;
        }
        registerNode(ir, id, match[2].trim(), usedIds, {
          kind,
          groupId: currentGroup,
        });
      }
    }

    const arrowTokenRegex =
      /\s*(-->|---|-\.->|-\.-|==>|===|--\s+[^-|\n]+\s+-->|--\s+[^-|\n]+\s+---|-\.\s+[^.|\n]+\s+\.->)\s*(?:\|([^|]+)\|\s*)?/g;
    if (arrowTokenRegex.test(line)) {
      arrowTokenRegex.lastIndex = 0;
      const segments: string[] = [];
      const arrows: Array<{ rawArrow: string; pipeLabel?: string }> = [];
      let lastIdx = 0;
      let match: RegExpExecArray | null;
      while ((match = arrowTokenRegex.exec(line)) !== null) {
        segments.push(line.slice(lastIdx, match.index));
        arrows.push({ rawArrow: match[1], pipeLabel: match[2]?.trim() });
        lastIdx = match.index + match[0].length;
      }
      segments.push(line.slice(lastIdx));

      for (let i = 0; i < arrows.length; i += 1) {
        const leftPart = segments[i]?.trim();
        const rightPart = segments[i + 1]?.trim();
        if (!leftPart || !rightPart) {
          continue;
        }

        const leftInfo = stripShapeModifiersFromEndpoint(leftPart);
        const rightInfo = stripShapeModifiersFromEndpoint(rightPart);
        if (
          FLOWCHART_RESERVED_WORDS.has(leftInfo.id.toLowerCase()) ||
          FLOWCHART_RESERVED_WORDS.has(rightInfo.id.toLowerCase())
        ) {
          continue;
        }

        registerNode(ir, leftInfo.id, leftInfo.label ?? leftInfo.id, usedIds, {
          kind: leftInfo.kind,
          groupId: currentGroup,
        });
        registerNode(ir, rightInfo.id, rightInfo.label ?? rightInfo.id, usedIds, {
          kind: rightInfo.kind,
          groupId: currentGroup,
        });

        let edgeLabel = arrows[i].pipeLabel;
        if (!edgeLabel) {
          const inlineMatch = arrows[i].rawArrow.match(
            /^(?:--|-\.)\s+(.+?)\s+(?:-->|---|\.->)$/,
          );
          if (inlineMatch) {
            edgeLabel = inlineMatch[1].trim();
          }
        }

        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: leftInfo.id,
          target: rightInfo.id,
          label: edgeLabel ? unquote(edgeLabel) : undefined,
          kind: arrows[i].rawArrow.includes(".") ? "dashed" : "arrow",
          matchConfidence: 1,
        });
      }
      continue;
    }

    const bareNodeMatch = line.match(/^([\p{L}\p{N}_-]+)$/u);
    if (
      bareNodeMatch &&
      currentGroup &&
      !FLOWCHART_RESERVED_WORDS.has(bareNodeMatch[1].toLowerCase())
    ) {
      const existing = ir.nodes.find((node) => node.id === bareNodeMatch[1]);
      if (existing) {
        existing.groupId = currentGroup;
      }
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

export function parseActivityMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = parseFlowchartMermaid(source, format);
  ir.kind = "activity";

  if (ir.edges.length === 0 && ir.nodes.length > 1) {
    for (let index = 1; index < ir.nodes.length; index += 1) {
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: ir.nodes[index - 1].id,
        target: ir.nodes[index].id,
        matchConfidence: 1,
      });
    }
  }

  return ir;
}

export function parseClassMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("class");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByName = new Map<string, string>();
  const classMembers: Record<string, DiagramClassMember[]> = {};
  const groups: DiagramGroup[] = [];

  function ensureClass(rawName: string, groupId?: string): string {
    const clean = unquote(rawName);
    const existing = idByName.get(clean);
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node && groupId && !node.groupId) {
        node.groupId = groupId;
      }
      return existing;
    }
    const id = uniqueDiagramId(clean, usedIds);
    idByName.set(clean, id);
    idByName.set(id, id);
    ir.nodes.push({
      id,
      label: clean,
      kind: "class",
      groupId,
      matchConfidence: 1,
    });
    classMembers[id] = classMembers[id] ?? [];
    return id;
  }

  let currentClassId: string | null = null;
  let currentGroupId: string | undefined;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || /^classDiagram\b/i.test(line)) {
      continue;
    }

    if (/^direction\s+/i.test(line) || /^note\b/i.test(line)) {
      continue;
    }

    if (line === "}") {
      if (currentClassId) {
        currentClassId = null;
      } else if (currentGroupId) {
        currentGroupId = undefined;
      }
      continue;
    }

    const nsMatch = line.match(/^namespace\s+([\p{L}\p{N}_-]+)\s*\{$/iu);
    if (nsMatch) {
      const grpName = nsMatch[1].trim();
      const grpId = uniqueDiagramId(grpName, usedIds);
      groups.push({ id: grpId, label: grpName });
      currentGroupId = grpId;
      continue;
    }

    const classDecl = line.match(
      /^class\s+([\p{L}\p{N}_"]+)(?:\s*\[["']?([^"'\]]+)["']?\])?\s*(\{)?$/iu,
    );
    if (classDecl) {
      const rawName = unquote(classDecl[1]);
      const displayLabel = classDecl[2]?.trim();
      const hasBrace = Boolean(classDecl[3]);
      const id = ensureClass(rawName, currentGroupId);
      if (displayLabel) {
        const node = ir.nodes.find((entry) => entry.id === id);
        if (node) {
          node.label = displayLabel;
        }
      }
      if (hasBrace) {
        currentClassId = id;
      }
      continue;
    }

    if (currentClassId) {
      const stereoMatch = line.match(/^<<\s*([^>]+?)\s*>>$/);
      if (stereoMatch) {
        const node = ir.nodes.find((entry) => entry.id === currentClassId);
        if (node) {
          node.semantic = { ...node.semantic, stereotype: stereoMatch[1].trim() };
        }
        continue;
      }

      const memberMatch = line.match(
        /^([+#~-])?\s*([\p{L}\p{N}_<>[\]]+)\s+([\p{L}\p{N}_]+(?:\([^)]*\))?)$/u,
      );
      if (memberMatch) {
        const visibility = (memberMatch[1] as "+" | "-" | "#" | "~" | undefined) ?? "+";
        const firstToken = memberMatch[2].trim();
        const secondToken = memberMatch[3].trim();
        const isMethod = secondToken.includes("(");
        classMembers[currentClassId] = classMembers[currentClassId] ?? [];
        classMembers[currentClassId].push({
          visibility,
          name: secondToken,
          type: firstToken,
          isMethod,
        });
        continue;
      }

      const methodOnlyMatch = line.match(
        /^([+#~-])?\s*([\p{L}\p{N}_]+\([^)]*\))(?:\s*:?\s*([\p{L}\p{N}_<>[\]]+))?$/u,
      );
      if (methodOnlyMatch) {
        const visibility = (methodOnlyMatch[1] as "+" | "-" | "#" | "~" | undefined) ?? "+";
        classMembers[currentClassId] = classMembers[currentClassId] ?? [];
        classMembers[currentClassId].push({
          visibility,
          name: methodOnlyMatch[2].trim(),
          type: methodOnlyMatch[3]?.trim(),
          isMethod: true,
        });
      }
      continue;
    }

    const relMatch = line.match(
      /^([\p{L}\p{N}_"]+)\s*(?:"([^"]*)"\s*)?(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|<--|\.\.>|<-\.+|-->|--|\.\.)\s*(?:"([^"]*)"\s*)?([\p{L}\p{N}_"]+)(?:\s*:\s*(.+))?$/u,
    );
    if (relMatch) {
      const rawLeft = unquote(relMatch[1]);
      const sourceCard = relMatch[2]?.trim();
      const arrow = relMatch[3];
      const targetCard = relMatch[4]?.trim();
      const rawRight = unquote(relMatch[5]);
      const label = relMatch[6]?.trim();

      const leftId = ensureClass(rawLeft, currentGroupId);
      const rightId = ensureClass(rawRight, currentGroupId);
      const isReverseInherit = arrow === "<|--" || arrow === "<|..";
      const sourceId = isReverseInherit ? rightId : leftId;
      const targetId = isReverseInherit ? leftId : rightId;
      const kind =
        arrow.includes("|>") || arrow.includes("<|")
          ? "inherit"
          : arrow.includes(".")
            ? "dashed"
            : "relation";

      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: label ? unquote(label) : undefined,
        kind,
        semantic: {
          arrow,
          sourceCardinality: sourceCard,
          targetCardinality: targetCard,
        },
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  ir.extras = { ...ir.extras, classMembers };
  return ir;
}

export function parseStateMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("state");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByAlias = new Map<string, string>();

  function ensureState(rawRef: string, explicitLabel?: string): string {
    const clean = unquote(rawRef);
    if (!clean || clean === "[*]") {
      return "";
    }
    const existing = idByAlias.get(clean);
    if (existing) {
      if (explicitLabel) {
        const node = ir.nodes.find((entry) => entry.id === existing);
        if (node && node.label === node.id) {
          node.label = explicitLabel;
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(clean, usedIds);
    idByAlias.set(clean, id);
    idByAlias.set(id, id);
    ir.nodes.push({
      id,
      label: explicitLabel || clean,
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("%%") ||
      /^stateDiagram(?:-v2)?\b/i.test(line) ||
      /^note\b/i.test(line) ||
      /^end\s+note\b/i.test(line)
    ) {
      continue;
    }

    const stateDecl = line.match(
      /^state\s+"([^"]+)"\s+as\s+([\p{L}\p{N}_-]+)(?:\s*<<\s*([^>]+?)\s*>>)?/iu,
    );
    if (stateDecl) {
      const label = stateDecl[1].trim();
      const alias = stateDecl[2].trim();
      const stereo = stateDecl[3]?.trim().toLowerCase();
      const id = ensureState(alias, label);
      idByAlias.set(label, id);
      if (stereo) {
        const node = ir.nodes.find((entry) => entry.id === id);
        if (node) {
          node.kind = stereo === "choice" ? "decision" : node.kind;
          node.semantic = { ...node.semantic, stereotype: stereo };
        }
      }
      continue;
    }

    const transMatch = line.match(
      /^(\[\*\]|[\p{L}\p{N}_-]+)\s*-->\s*(\[\*\]|[\p{L}\p{N}_-]+)(?:\s*:\s*(.+))?$/u,
    );
    if (transMatch) {
      const fromRaw = transMatch[1].trim();
      const toRaw = transMatch[2].trim();
      const label = transMatch[3]?.trim();

      if (fromRaw === "[*]" && toRaw !== "[*]") {
        const toId = ensureState(toRaw);
        const node = ir.nodes.find((entry) => entry.id === toId);
        if (node) {
          node.semantic = { ...node.semantic, isInitial: true };
        }
        continue;
      }

      if (toRaw === "[*]" && fromRaw !== "[*]") {
        const fromId = ensureState(fromRaw);
        const node = ir.nodes.find((entry) => entry.id === fromId);
        if (node) {
          node.semantic = { ...node.semantic, isFinal: true };
        }
        continue;
      }

      if (fromRaw === "[*]" || toRaw === "[*]") {
        continue;
      }

      const sourceId = ensureState(fromRaw);
      const targetId = ensureState(toRaw);
      if (sourceId && targetId) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: sourceId,
          target: targetId,
          label,
          matchConfidence: 1,
        });
      }
      continue;
    }

    const descMatch = line.match(/^([\p{L}\p{N}_-]+)\s*:\s*(.+)$/u);
    if (descMatch && descMatch[1] !== "stateDiagram" && descMatch[1] !== "stateDiagram-v2") {
      ensureState(descMatch[1], descMatch[2].trim());
    }
  }

  return ir;
}

export function parseSequenceMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("sequence");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByAlias = new Map<string, string>();

  function ensureParticipant(
    rawAlias: string,
    explicitLabel?: string,
    participantType = "participant",
  ): string {
    const cleanAlias = unquote(rawAlias);
    if (!cleanAlias) {
      return "";
    }
    const existing = idByAlias.get(cleanAlias);
    if (existing) {
      if (explicitLabel) {
        const node = ir.nodes.find((entry) => entry.id === existing);
        if (node && node.label === node.id) {
          node.label = explicitLabel;
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(cleanAlias, usedIds);
    const label = explicitLabel || cleanAlias;
    idByAlias.set(cleanAlias, id);
    idByAlias.set(label, id);
    ir.nodes.push({
      id,
      label,
      kind: "actor",
      semantic: { participantType: participantType.toLowerCase() },
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || /^sequenceDiagram\b/i.test(line)) {
      continue;
    }

    const declMatch = line.match(
      /^(participant|actor)\s+([\p{L}\p{N}_-]+)(?:\s+as\s+(.+))?$/iu,
    );
    if (declMatch) {
      const pType = declMatch[1];
      const alias = declMatch[2].trim();
      const label = declMatch[3] ? unquote(declMatch[3]) : alias;
      ensureParticipant(alias, label, pType);
      continue;
    }

    const msgMatch = line.match(
      /^([\p{L}\p{N}_-]+)\s*(-->>|->>|-->|->|--x|-x|--\)|-\))\s*[+-]?([\p{L}\p{N}_-]+)\s*:\s*(.+)$/u,
    );
    if (msgMatch) {
      const fromAlias = msgMatch[1].trim();
      const arrow = msgMatch[2];
      const toAlias = msgMatch[3].trim();
      const message = msgMatch[4].trim();

      const sourceId = ensureParticipant(fromAlias);
      const targetId = ensureParticipant(toAlias);
      if (!sourceId || !targetId) {
        continue;
      }

      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: message,
        kind: "message",
        semantic: { dashed: arrow.startsWith("--") },
        matchConfidence: 1,
      });
    }
  }

  return ir;
}

export function parseErMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("er");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByLabel = new Map<string, string>();
  const entityAttributes: Record<string, DiagramEntityAttribute[]> = {};

  function ensureEntity(rawLabel: string): string {
    const label = unquote(rawLabel);
    const existing = idByLabel.get(label);
    if (existing) {
      return existing;
    }

    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      matchConfidence: 1,
    });
    idByLabel.set(label, id);
    idByLabel.set(id, id);
    entityAttributes[id] = entityAttributes[id] ?? [];
    return id;
  }

  let currentEntityId: string | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || /^erDiagram\b/i.test(line)) {
      continue;
    }

    if (line === "}") {
      currentEntityId = null;
      continue;
    }

    const relMatch = line.match(
      /^([\p{L}\p{N}_"-]+)\s+([|o}{]+(?:--|\.\.)[|o}{]+)\s+([\p{L}\p{N}_"-]+)(?:\s*:\s*(.+))?$/u,
    );
    if (relMatch && !currentEntityId) {
      const from = ensureEntity(relMatch[1]);
      const cardinality = relMatch[2].trim();
      const to = ensureEntity(relMatch[3]);
      const label = relMatch[4] ? unquote(relMatch[4]) : undefined;
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: from,
        target: to,
        label,
        kind: "relation",
        semantic: { cardinality },
        matchConfidence: 1,
      });
      continue;
    }

    const entityBlockMatch = line.match(/^([\p{L}\p{N}_"-]+)\s*\{$/u);
    if (entityBlockMatch) {
      const name = unquote(entityBlockMatch[1]);
      if (name.toLowerCase() !== "erdiagram") {
        currentEntityId = ensureEntity(name);
      }
      continue;
    }

    if (currentEntityId) {
      const attrMatch = line.match(
        /^([\p{L}\p{N}_-]+)\s+([\p{L}\p{N}_-]+)(?:\s+(PK|FK|UK))?(?:\s+"([^"]*)")?$/iu,
      );
      if (attrMatch) {
        const type = attrMatch[1].trim();
        const name = attrMatch[2].trim();
        const keyFlag = attrMatch[3]?.toUpperCase();
        const comment = attrMatch[4]?.trim();
        entityAttributes[currentEntityId] = entityAttributes[currentEntityId] ?? [];
        entityAttributes[currentEntityId].push({
          name,
          type,
          isPrimaryKey: keyFlag === "PK",
          isForeignKey: keyFlag === "FK",
          comment,
        });
      }
    }
  }

  ir.extras = { ...ir.extras, entityAttributes };
  return ir;
}

export function parseGanttMermaid(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  let previousId: string | null = null;
  let currentSection: string | undefined;

  const GANT_STATUS_TAGS = new Set(["done", "active", "crit", "milestone"]);

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("%%") ||
      /^(?:gantt|dateFormat|axisFormat|excludes|todayMarker|tickInterval|weekday)\b/i.test(
        line,
      )
    ) {
      continue;
    }

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      ir.extras = { ...ir.extras, title: unquote(titleMatch[1]) };
      continue;
    }

    const sectionMatch = line.match(/^section\s+(.+)$/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const taskMatch = line.match(/^([^:]+)\s*:\s*(.+)$/);
    if (!taskMatch) {
      continue;
    }

    const label = taskMatch[1].trim();
    const rawMeta = taskMatch[2]
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    let status: string | undefined;
    let isMilestone = false;
    const remaining: string[] = [];

    for (const token of rawMeta) {
      const lower = token.toLowerCase();
      if (GANT_STATUS_TAGS.has(lower)) {
        if (lower === "milestone") {
          isMilestone = true;
        } else {
          status = lower;
        }
      } else {
        remaining.push(token);
      }
    }

    let taskId: string | undefined;
    let afterIds: string[] = [];
    let startDate: string | undefined;
    let duration: string | undefined;

    for (const token of remaining) {
      const afterMatch = token.match(/^after\s+(.+)$/i);
      if (afterMatch) {
        afterIds = afterMatch[1].trim().split(/\s+/).filter(Boolean);
        continue;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
        startDate = token;
        continue;
      }
      if (/^\d+\s*[dwmyh]$/i.test(token)) {
        duration = token;
        continue;
      }
      if (!taskId && /^[\p{L}\p{N}_-]+$/u.test(token)) {
        taskId = token;
      }
    }

    const id = uniqueDiagramId(taskId || label, usedIds);
    ir.nodes.push({
      id,
      label,
      kind: "task",
      semantic: {
        section: currentSection,
        status,
        milestone: isMilestone || undefined,
        startDate,
        duration,
      },
      matchConfidence: 1,
    });

    if (afterIds.length > 0) {
      for (const depId of afterIds) {
        const depNode = ir.nodes.find((node) => node.id === depId);
        if (depNode && depNode.id !== id) {
          ir.edges.push({
            id: `e${ir.edges.length + 1}`,
            source: depNode.id,
            target: id,
            matchConfidence: 1,
          });
        }
      }
    } else if (previousId && previousId !== id) {
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
