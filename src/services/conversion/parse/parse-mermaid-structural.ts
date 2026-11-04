import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createEmptyDiagramIR,
  type DiagramClassMember,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";

export function unquote(value: string): string {
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
