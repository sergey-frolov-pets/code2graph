import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createEmptyDiagramIR,
  type DiagramClassMember,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  type DiagramNodeShape,
  type DiagramNote,
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
    if (options?.visual) {
      existing.visual = {
        ...existing.visual,
        shape: existing.visual?.shape ?? options.visual.shape,
        fill: existing.visual?.fill ?? options.visual.fill,
        stroke: existing.visual?.stroke ?? options.visual.stroke,
      };
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

interface EndpointInfo {
  id: string;
  label?: string;
  kind?: DiagramNode["kind"];
  shape?: DiagramNodeShape;
  styleClass?: string;
}

const ENDPOINT_SHAPES: Array<{
  regex: RegExp;
  kind: DiagramNode["kind"];
  shape: DiagramNodeShape;
}> = [
  { regex: /^([\p{L}\p{N}_-]+)\s*\(\(\(([^)]+)\)\)\)$/u, kind: "end", shape: "ellipse" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\(\[([^\]]+)\]\)$/u, kind: "start", shape: "round" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\(\(([^)]+)\)\)$/u, kind: "default", shape: "ellipse" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[\(([^)]+)\)\]$/u, kind: "system", shape: "cylinder" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[\[([^\]]+)\]\]$/u, kind: "container", shape: "predefinedProcess" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\{\{([^}]+)\}\}$/u, kind: "decision", shape: "hexagon" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\{([^}]+)\}$/u, kind: "decision", shape: "diamond" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[\/([^/\\]+)\/\]$/u, kind: "default", shape: "parallelogram" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[\\([^/\\]+)\\\]$/u, kind: "default", shape: "parallelogram" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[\/([^/\\]+)\\\]$/u, kind: "default", shape: "trapezoid" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[\\([^/\\]+)\/\]$/u, kind: "default", shape: "trapezoid" },
  { regex: /^([\p{L}\p{N}_-]+)\s*>([^\]]+)\]$/u, kind: "default", shape: "parallelogram" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\[([^\]]+)\]$/u, kind: "default", shape: "rect" },
  { regex: /^([\p{L}\p{N}_-]+)\s*\(([^)]+)\)$/u, kind: "default", shape: "round" },
];

function stripShapeModifiersFromEndpoint(raw: string): EndpointInfo {
  let token = raw.trim();
  // Strip optional edge ID prefix such as e1@ before arrow or on token
  token = token.replace(/^[\p{L}\p{N}_-]+@\s*$/u, "").trim();

  let styleClass: string | undefined;
  const classSuffixMatch = token.match(/^(.*?):::([\p{L}\p{N}_-]+)$/u);
  if (classSuffixMatch) {
    token = classSuffixMatch[1].trim();
    styleClass = classSuffixMatch[2].trim();
  }

  for (const { regex, kind, shape } of ENDPOINT_SHAPES) {
    const match = token.match(regex);
    if (match) {
      return {
        id: match[1].trim(),
        label: unquote(match[2]),
        kind,
        shape,
        styleClass,
      };
    }
  }

  const bareMatch = token.match(/^([\p{L}\p{N}_-]+)/u);
  return {
    id: bareMatch?.[1] ?? token,
    styleClass,
  };
}

function parseStyleProps(rawProps: string): { fill?: string; stroke?: string } {
  let fill: string | undefined;
  let stroke: string | undefined;
  for (const token of rawProps.split(",")) {
    const [k, v] = token.split(":").map((s) => s.trim());
    if (!k || !v) continue;
    const keyLower = k.toLowerCase();
    if (keyLower === "fill") {
      fill = v;
    } else if (keyLower === "stroke") {
      stroke = v;
    }
  }
  return { fill, stroke };
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
  const classDefs = new Map<string, { fill?: string; stroke?: string }>();
  const nodeClassAssignments = new Map<string, string>();
  const directNodeStyles = new Map<string, { fill?: string; stroke?: string }>();
  const linkStyles = new Map<number, { stroke?: string }>();

  const inlinePatterns: Array<{
    pattern: RegExp;
    kind: DiagramNode["kind"];
    shape: DiagramNodeShape;
  }> = [
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\(\(\(([^)]+)\)\)\)/gu, kind: "end", shape: "ellipse" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\(\[([^\]]+)\]\)/gu, kind: "start", shape: "round" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\(\(([^)]+)\)\)/gu, kind: "default", shape: "ellipse" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\(([^)]+)\)\]/gu, kind: "system", shape: "cylinder" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\[([^\]]+)\]\]/gu, kind: "container", shape: "predefinedProcess" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\{\{([^}]+)\}\}/gu, kind: "decision", shape: "hexagon" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\/([^/\\]+)\/\]/gu, kind: "default", shape: "parallelogram" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\\([^/\\]+)\\\]/gu, kind: "default", shape: "parallelogram" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\/([^/\\]+)\\\]/gu, kind: "default", shape: "trapezoid" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[\\([^/\\]+)\/\]/gu, kind: "default", shape: "trapezoid" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\[(?!\[|\(|\/|\\)([^\]]+)\]/gu, kind: "default", shape: "rect" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\((?!\[|\()([^)]+)\)/gu, kind: "default", shape: "round" },
    { pattern: /\b([\p{L}\p{N}_-]+)\s*\{(?!\{)([^}]+)\}/gu, kind: "decision", shape: "diamond" },
  ];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) {
      continue;
    }

    if (/^(?:flowchart|graph)\b/i.test(line)) {
      continue;
    }

    const classDefMatch = line.match(/^classDef\s+([\p{L}\p{N}_-]+)\s+(.+)$/iu);
    if (classDefMatch) {
      classDefs.set(classDefMatch[1].trim(), parseStyleProps(classDefMatch[2]));
      continue;
    }

    const classAssignMatch = line.match(/^class\s+([^\s]+)\s+([\p{L}\p{N}_-]+)\s*;?$/iu);
    if (classAssignMatch) {
      const className = classAssignMatch[2].trim();
      for (const nodeId of classAssignMatch[1].split(",").map((s) => s.trim())) {
        if (nodeId) {
          nodeClassAssignments.set(nodeId, className);
        }
      }
      continue;
    }

    const styleMatch = line.match(/^style\s+([\p{L}\p{N}_-]+)\s+(.+)$/iu);
    if (styleMatch) {
      directNodeStyles.set(styleMatch[1].trim(), parseStyleProps(styleMatch[2]));
      continue;
    }

    const linkStyleMatch = line.match(/^linkStyle\s+(\d+)\s+(.+)$/i);
    if (linkStyleMatch) {
      const idx = Number.parseInt(linkStyleMatch[1], 10);
      const props = parseStyleProps(linkStyleMatch[2]);
      if (props.stroke) {
        linkStyles.set(idx, { stroke: props.stroke });
      }
      continue;
    }

    if (/^(?:click|direction)\b/i.test(line)) {
      continue;
    }

    const v13ShapeMatch = line.match(/^([\p{L}\p{N}_-]+)@\{\s*([^}]+)\s*\}/u);
    if (v13ShapeMatch) {
      const id = v13ShapeMatch[1].trim();
      const body = v13ShapeMatch[2];
      const labelMatch = body.match(/label\s*:\s*(?:"([^"]+)"|'([^']+)'|([^,\s}]+))/i);
      const shapeMatch = body.match(/shape\s*:\s*([a-zA-Z0-9_-]+)/i);
      const label = labelMatch?.[1] ?? labelMatch?.[2] ?? labelMatch?.[3] ?? id;
      const rawShape = (shapeMatch?.[1] ?? "").toLowerCase();
      const shape: DiagramNodeShape =
        rawShape.includes("diam")
          ? "diamond"
          : rawShape.includes("cyl") || rawShape.includes("db")
            ? "cylinder"
            : rawShape.includes("hex")
              ? "hexagon"
              : rawShape.includes("circ") || rawShape.includes("stad")
                ? "ellipse"
                : "rect";
      registerNode(ir, id, label, usedIds, {
        groupId: groupStack[groupStack.length - 1],
        visual: { shape },
      });
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
        kind: "subgraph",
      });
      groupStack.push(groupId);
      continue;
    }

    if (/^end\s*$/i.test(line)) {
      groupStack.pop();
      continue;
    }

    const currentGroup = groupStack[groupStack.length - 1];

    for (const { pattern, kind, shape } of inlinePatterns) {
      for (const match of line.matchAll(pattern)) {
        const id = match[1].trim();
        if (FLOWCHART_RESERVED_WORDS.has(id.toLowerCase())) {
          continue;
        }
        registerNode(ir, id, match[2].trim(), usedIds, {
          kind,
          groupId: currentGroup,
          visual: { shape },
        });
      }
    }

    const arrowTokenRegex =
      /\s*(?:[\p{L}\p{N}_-]+@)?(<-->|<-\.->|-->|---|-\.->|-\.-|==>|===|--o|--x|o--o|x--x|--\s+[^-|\n]+\s+-->|--\s+[^-|\n]+\s+---|-\.\s+[^.|\n]+\s+\.->)\s*(?:\|([^|]+)\|\s*)?/gu;
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
        const leftRawGroup = segments[i]?.trim();
        const rightRawGroup = segments[i + 1]?.trim();
        if (!leftRawGroup || !rightRawGroup) {
          continue;
        }

        const leftParts = leftRawGroup.split(/\s*&\s*/).map((s) => s.trim()).filter(Boolean);
        const rightParts = rightRawGroup.split(/\s*&\s*/).map((s) => s.trim()).filter(Boolean);

        let edgeLabel = arrows[i].pipeLabel;
        if (!edgeLabel) {
          const inlineMatch = arrows[i].rawArrow.match(
            /^(?:--|-\.)\s+(.+?)\s+(?:-->|---|\.->)$/,
          );
          if (inlineMatch) {
            edgeLabel = inlineMatch[1].trim();
          }
        }

        const rawArrow = arrows[i].rawArrow;
        const isUndirected = rawArrow === "---" || rawArrow === "-.-" || rawArrow === "===";
        const isDashed = rawArrow.includes(".");

        for (const leftPart of leftParts) {
          const leftInfo = stripShapeModifiersFromEndpoint(leftPart);
          if (FLOWCHART_RESERVED_WORDS.has(leftInfo.id.toLowerCase())) {
            continue;
          }
          if (leftInfo.styleClass) {
            nodeClassAssignments.set(leftInfo.id, leftInfo.styleClass);
          }
          registerNode(ir, leftInfo.id, leftInfo.label ?? leftInfo.id, usedIds, {
            kind: leftInfo.kind,
            groupId: currentGroup,
            visual: leftInfo.shape ? { shape: leftInfo.shape } : undefined,
          });

          for (const rightPart of rightParts) {
            const rightInfo = stripShapeModifiersFromEndpoint(rightPart);
            if (FLOWCHART_RESERVED_WORDS.has(rightInfo.id.toLowerCase())) {
              continue;
            }
            if (rightInfo.styleClass) {
              nodeClassAssignments.set(rightInfo.id, rightInfo.styleClass);
            }
            registerNode(ir, rightInfo.id, rightInfo.label ?? rightInfo.id, usedIds, {
              kind: rightInfo.kind,
              groupId: currentGroup,
              visual: rightInfo.shape ? { shape: rightInfo.shape } : undefined,
            });

            ir.edges.push({
              id: `e${ir.edges.length + 1}`,
              source: leftInfo.id,
              target: rightInfo.id,
              label: edgeLabel ? unquote(edgeLabel) : undefined,
              kind: isDashed ? "dashed" : "arrow",
              directed: !isUndirected,
              matchConfidence: 1,
            });
          }
        }
      }
      continue;
    }

    const bareNodeMatch = line.match(/^([\p{L}\p{N}_-]+)(?:::([\p{L}\p{N}_-]+))?$/u);
    if (
      bareNodeMatch &&
      !FLOWCHART_RESERVED_WORDS.has(bareNodeMatch[1].toLowerCase())
    ) {
      const nodeId = bareNodeMatch[1];
      if (bareNodeMatch[2]) {
        nodeClassAssignments.set(nodeId, bareNodeMatch[2]);
      }
      const existing = ir.nodes.find((node) => node.id === nodeId);
      if (existing && currentGroup) {
        existing.groupId = currentGroup;
      }
    }
  }

  for (const node of ir.nodes) {
    const assignedClass = nodeClassAssignments.get(node.id);
    const classStyle = assignedClass ? classDefs.get(assignedClass) : undefined;
    const directStyle = directNodeStyles.get(node.id);
    const fill = directStyle?.fill ?? classStyle?.fill;
    const stroke = directStyle?.stroke ?? classStyle?.stroke;
    if (fill || stroke) {
      node.visual = {
        ...node.visual,
        fill: fill ?? node.visual?.fill,
        stroke: stroke ?? node.visual?.stroke,
      };
    }
  }

  for (const [edgeIdx, style] of linkStyles.entries()) {
    const edge = ir.edges[edgeIdx];
    if (edge && style.stroke) {
      edge.color = style.stroke;
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
  const notes: DiagramNote[] = [];

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

    if (/^direction\s+/i.test(line)) {
      continue;
    }

    const noteForMatch = line.match(
      /^note\s+for\s+([\p{L}\p{N}_"]+)\s+"([^"]+)"$/iu,
    );
    if (noteForMatch) {
      notes.push({
        targetId: unquote(noteForMatch[1]),
        text: noteForMatch[2].replace(/\\n/g, "\n"),
      });
      continue;
    }

    const generalNoteMatch = line.match(/^note\s+"([^"]+)"$/i);
    if (generalNoteMatch) {
      notes.push({ text: generalNoteMatch[1].replace(/\\n/g, "\n") });
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
      groups.push({ id: grpId, label: grpName, kind: "namespace" });
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
        directed: arrow !== "--" && arrow !== "..",
        sourceLabel: isReverseInherit ? targetCard : sourceCard,
        targetLabel: isReverseInherit ? sourceCard : targetCard,
        semantic: {
          arrow,
          relationType: arrow.includes(".") && (arrow.includes("|>") || arrow.includes("<|"))
            ? "realization"
            : undefined,
          sourceCardinality: isReverseInherit ? targetCard : sourceCard,
          targetCardinality: isReverseInherit ? sourceCard : targetCard,
        },
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  ir.extras = {
    ...ir.extras,
    classMembers,
    notes: notes.length > 0 ? notes : undefined,
  };
  return ir;
}
