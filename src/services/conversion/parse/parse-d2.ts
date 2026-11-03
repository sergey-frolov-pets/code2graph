import { unwrapD2Source } from "@shared/d2-source";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramClassMember,
  type DiagramEdge,
  type DiagramEntityAttribute,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  type DiagramNodeSemanticKind,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";

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

function stripD2Comments(source: string): string {
  return unwrapD2Source(source)
    .replace(/"""[\s\S]*?"""/g, "")
    .split(/\r?\n/)
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (inString && ch === "\\") {
          i += 1;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString && ch === "#") {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join("\n");
}

function mapD2ShapeToSemanticKind(shape: string): DiagramNodeSemanticKind {
  const normalized = shape.trim().toLowerCase();
  switch (normalized) {
    case "person":
      return "actor";
    case "class":
      return "class";
    case "cylinder":
    case "stored_data":
      return "system";
    case "diamond":
      return "decision";
    case "oval":
    case "circle":
      return "start";
    case "hexagon":
    case "queue":
    case "package":
    case "cloud":
    case "rectangle":
    case "square":
      return "container";
    default:
      return "default";
  }
}

const RESERVED_KEYS = new Set([
  "direction",
  "shape",
  "style",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dash",
  "font-size",
  "font-color",
  "shadow",
  "3d",
  "multiple",
  "opacity",
  "width",
  "height",
  "icon",
  "near",
  "tooltip",
  "link",
  "constraint",
  "grid-rows",
  "grid-columns",
  "grid-gap",
  "vars",
  "classes",
  "label",
]);

function parseD2Sequence(cleaned: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("sequence");
  ir.direction = detectDiagramDirection(cleaned, format);
  ir.metadata = { sourceFormat: format };

  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();

  function ensureActor(rawKey: string, explicitLabel?: string): string {
    const key = rawKey.trim().split(".").pop() ?? rawKey.trim();
    const existing = aliasToId.get(key);
    if (existing) {
      if (explicitLabel) {
        const node = ir.nodes.find((entry) => entry.id === existing);
        if (node && node.label === key) {
          node.label = explicitLabel;
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(key, usedIds);
    aliasToId.set(key, id);
    aliasToId.set(rawKey.trim(), id);
    ir.nodes.push({
      id,
      label: explicitLabel || key,
      kind: "actor",
      matchConfidence: 1,
    });
    return id;
  }

  const lines = cleaned.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "{" || line === "}") {
      continue;
    }

    const edgeMatch = line.match(
      /^([\p{L}\p{N}_.-]+)\s*(?:<->|->|--|<-)\s*([\p{L}\p{N}_.-]+)(?:\s*:\s*(.+?))?(?:\s*\{.*)?$/u,
    );
    if (edgeMatch) {
      const fromKey = edgeMatch[1];
      const toKey = edgeMatch[2];
      const label = edgeMatch[3] ? unquote(edgeMatch[3]) : undefined;
      const sourceId = ensureActor(fromKey);
      const targetId = ensureActor(toKey);
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label,
        kind: "message",
        matchConfidence: 1,
      });
      continue;
    }

    const propMatch = line.match(
      /^([\p{L}\p{N}_-]+)\s*:\s*([^{]+?)(?:\s*\{)?$/u,
    );
    if (propMatch) {
      const key = propMatch[1].trim();
      const val = unquote(propMatch[2]);
      if (RESERVED_KEYS.has(key.toLowerCase())) {
        continue;
      }
      if (val.toLowerCase() === "sequence_diagram") {
        continue;
      }
      ensureActor(key, val || key);
      continue;
    }

    const containerMatch = line.match(/^([\p{L}\p{N}_-]+)\s*:\s*\{$/u);
    if (containerMatch) {
      if (!ir.extras?.title) {
        ir.extras = { ...ir.extras, title: containerMatch[1] };
      }
      continue;
    }

    const bareMatch = line.match(/^([\p{L}\p{N}_-]+)$/u);
    if (bareMatch && !RESERVED_KEYS.has(bareMatch[1].toLowerCase())) {
      ensureActor(bareMatch[1]);
    }
  }

  return ir;
}

function parseD2Class(cleaned: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("class");
  ir.direction = detectDiagramDirection(cleaned, format);
  ir.metadata = { sourceFormat: format };

  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const classMembers: Record<string, DiagramClassMember[]> = {};

  function ensureClass(rawKey: string, explicitLabel?: string): string {
    const key = rawKey.trim().split(".")[0] ?? rawKey.trim();
    const existing = aliasToId.get(key);
    if (existing) {
      if (explicitLabel) {
        const node = ir.nodes.find((entry) => entry.id === existing);
        if (node) {
          node.label = explicitLabel;
        }
      }
      return existing;
    }
    const id = uniqueDiagramId(key, usedIds);
    aliasToId.set(key, id);
    ir.nodes.push({
      id,
      label: explicitLabel || key,
      kind: "class",
      matchConfidence: 1,
    });
    classMembers[id] = classMembers[id] ?? [];
    return id;
  }

  let currentClassId: string | null = null;
  let braceDepth = 0;

  for (const rawLine of cleaned.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      if (braceDepth === 0) {
        currentClassId = null;
      }
      continue;
    }

    const edgeMatch = line.match(
      /^([\p{L}\p{N}_.-]+)\s*(<->|->|--|<-)\s*([\p{L}\p{N}_.-]+)(?:\s*:\s*(.+?))?(?:\s*\{.*)?$/u,
    );
    if (edgeMatch && braceDepth === 0) {
      const sourceId = ensureClass(edgeMatch[1]);
      const targetId = ensureClass(edgeMatch[3]);
      const label = edgeMatch[4] ? unquote(edgeMatch[4]) : undefined;
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label,
        kind: "relation",
        matchConfidence: 1,
      });
      continue;
    }

    const blockStartMatch = line.match(
      /^([\p{L}\p{N}_-]+)\s*(?::\s*([^{]*?))?\s*\{$/u,
    );
    if (blockStartMatch && braceDepth === 0) {
      const key = blockStartMatch[1].trim();
      if (RESERVED_KEYS.has(key.toLowerCase())) {
        braceDepth += 1;
        continue;
      }
      const rawLabel = blockStartMatch[2] ? unquote(blockStartMatch[2]) : key;
      currentClassId = ensureClass(key, rawLabel || key);
      braceDepth = 1;
      continue;
    }

    if (currentClassId && braceDepth === 1) {
      if (/^shape\s*:/i.test(line)) {
        continue;
      }
      const memberMatch = line.match(
        /^([+#~-])?([\p{L}\p{N}_]+(?:\([^)]*\))?)\s*(?::\s*(.+))?$/u,
      );
      if (memberMatch) {
        const visibility = (memberMatch[1] as "+" | "-" | "#" | "~" | undefined) ?? "+";
        const rawName = memberMatch[2].trim();
        const isMethod = rawName.includes("(");
        const type = memberMatch[3] ? unquote(memberMatch[3]) : undefined;
        classMembers[currentClassId] = classMembers[currentClassId] ?? [];
        classMembers[currentClassId].push({
          visibility,
          name: rawName,
          type,
          isMethod,
        });
      }
    }
  }

  ir.extras = { ...ir.extras, classMembers };
  return ir;
}

function parseD2SqlTable(cleaned: string, format: DiagramFormat): DiagramIR {
  const ir = createEmptyDiagramIR("er");
  ir.direction = detectDiagramDirection(cleaned, format);
  ir.metadata = { sourceFormat: format };

  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const entityAttributes: Record<string, DiagramEntityAttribute[]> = {};

  function ensureEntity(rawKey: string, explicitLabel?: string): string {
    const key = rawKey.trim().split(".")[0] ?? rawKey.trim();
    const existing = aliasToId.get(key);
    if (existing) {
      if (explicitLabel) {
        const node = ir.nodes.find((entry) => entry.id === existing);
        if (node) {
          node.label = explicitLabel;
        }
      }
      return existing;
    }
    const id = uniqueDiagramId(key, usedIds);
    aliasToId.set(key, id);
    ir.nodes.push({
      id,
      label: explicitLabel || key,
      matchConfidence: 1,
    });
    entityAttributes[id] = entityAttributes[id] ?? [];
    return id;
  }

  let currentEntityId: string | null = null;
  let braceDepth = 0;

  for (const rawLine of cleaned.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      if (braceDepth === 0) {
        currentEntityId = null;
      }
      continue;
    }

    const edgeMatch = line.match(
      /^([\p{L}\p{N}_.-]+)\s*(?:<->|->|--|<-)\s*([\p{L}\p{N}_.-]+)(?:\s*:\s*(.+?))?(?:\s*\{.*)?$/u,
    );
    if (edgeMatch && braceDepth === 0) {
      const sourceId = ensureEntity(edgeMatch[1]);
      const targetId = ensureEntity(edgeMatch[2]);
      const label = edgeMatch[3] ? unquote(edgeMatch[3]) : undefined;
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label,
        kind: "relation",
        matchConfidence: 1,
      });
      continue;
    }

    const blockStartMatch = line.match(
      /^([\p{L}\p{N}_-]+)\s*(?::\s*([^{]*?))?\s*\{$/u,
    );
    if (blockStartMatch && braceDepth === 0) {
      const key = blockStartMatch[1].trim();
      if (RESERVED_KEYS.has(key.toLowerCase())) {
        braceDepth += 1;
        continue;
      }
      const rawLabel = blockStartMatch[2] ? unquote(blockStartMatch[2]) : key;
      currentEntityId = ensureEntity(key, rawLabel || key);
      braceDepth = 1;
      continue;
    }

    if (currentEntityId && braceDepth === 1) {
      if (/^shape\s*:/i.test(line)) {
        continue;
      }
      const colMatch = line.match(
        /^([\p{L}\p{N}_-]+)\s*:\s*([^{]+?)(?:\s*\{([^}]*)\})?$/u,
      );
      if (colMatch) {
        const colName = colMatch[1].trim();
        const colType = unquote(colMatch[2]);
        const constraintPart = colMatch[3] ?? "";
        const isPrimaryKey = /primary_key|\bpk\b/i.test(constraintPart);
        const isForeignKey = /foreign_key|\bfk\b/i.test(constraintPart);
        entityAttributes[currentEntityId] = entityAttributes[currentEntityId] ?? [];
        entityAttributes[currentEntityId].push({
          name: colName,
          type: colType || "string",
          isPrimaryKey,
          isForeignKey,
        });
      }
    }
  }

  ir.extras = { ...ir.extras, entityAttributes };
  return ir;
}

export function parseD2ToIr(source: string, format: DiagramFormat): DiagramIR {
  const cleaned = stripD2Comments(source);
  const kind = classifyDiagramKind(cleaned, format);

  if (kind === "sequence") {
    return parseD2Sequence(cleaned, format);
  }
  if (kind === "class") {
    return parseD2Class(cleaned, format);
  }
  if (kind === "er") {
    return parseD2SqlTable(cleaned, format);
  }

  const ir = createEmptyDiagramIR(kind === "architecture" ? "architecture" : "graph");
  ir.direction = detectDiagramDirection(cleaned, format);
  ir.metadata = { sourceFormat: format };

  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const groups: DiagramGroup[] = [];
  const scopeStack: Array<{ key: string; isGroup: boolean; groupId?: string; nodeId?: string }> = [];

  function resolveScopedKey(localKey: string): string {
    const groupPrefixes = scopeStack
      .filter((entry) => entry.isGroup)
      .map((entry) => entry.key);
    return groupPrefixes.length > 0 ? `${groupPrefixes.join(".")}.${localKey}` : localKey;
  }

  function currentGroupId(): string | undefined {
    for (let i = scopeStack.length - 1; i >= 0; i -= 1) {
      if (scopeStack[i].isGroup && scopeStack[i].groupId) {
        return scopeStack[i].groupId;
      }
    }
    return undefined;
  }

  function ensureNode(rawKey: string, explicitLabel?: string, groupId?: string): DiagramNode {
    const cleanKey = rawKey.trim();
    const shortKey = cleanKey.split(".").pop() ?? cleanKey;
    const existingId = aliasToId.get(cleanKey) ?? aliasToId.get(shortKey);
    if (existingId) {
      const found = ir.nodes.find((entry) => entry.id === existingId);
      if (found) {
        if (explicitLabel && found.label === shortKey) {
          found.label = explicitLabel;
        }
        if (groupId && !found.groupId) {
          found.groupId = groupId;
        }
        return found;
      }
    }

    const id = uniqueDiagramId(shortKey, usedIds);
    aliasToId.set(cleanKey, id);
    aliasToId.set(shortKey, id);
    const node: DiagramNode = {
      id,
      label: explicitLabel || shortKey,
      groupId,
      matchConfidence: 1,
    };
    ir.nodes.push(node);
    return node;
  }

  const lines = cleaned.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    if (line === "}") {
      scopeStack.pop();
      continue;
    }

    const edgeMatch = line.match(
      /^([\p{L}\p{N}_.-]+)\s*(<->|->|--|<-)\s*([\p{L}\p{N}_.-]+)(?:\s*:\s*(.+?))?(?:\s*\{.*)?$/u,
    );
    if (edgeMatch) {
      const fromRef = edgeMatch[1].includes(".")
        ? edgeMatch[1]
        : resolveScopedKey(edgeMatch[1]);
      const toRef = edgeMatch[3].includes(".")
        ? edgeMatch[3]
        : resolveScopedKey(edgeMatch[3]);
      const groupId = currentGroupId();
      const sourceNode = ensureNode(fromRef, undefined, groupId);
      const targetNode = ensureNode(toRef, undefined, groupId);
      const label = edgeMatch[4] ? unquote(edgeMatch[4]) : undefined;
      const edge: DiagramEdge = {
        id: `e${ir.edges.length + 1}`,
        source: sourceNode.id,
        target: targetNode.id,
        label,
        kind: edgeMatch[2] === "--" ? "dashed" : "arrow",
        matchConfidence: 1,
      };
      ir.edges.push(edge);
      continue;
    }

    const blockMatch = line.match(
      /^([\p{L}\p{N}_-]+)\s*(?::\s*([^{]*?))?\s*\{$/u,
    );
    if (blockMatch) {
      const key = blockMatch[1].trim();
      if (RESERVED_KEYS.has(key.toLowerCase())) {
        scopeStack.push({ key, isGroup: false });
        continue;
      }

      const rawLabel = blockMatch[2] ? unquote(blockMatch[2]) : key;
      let hasChildNodesOrEdges = false;
      let depth = 1;
      for (let j = i + 1; j < lines.length && depth > 0; j += 1) {
        const inner = lines[j].trim();
        if (inner.endsWith("{")) {
          const innerKey = inner.split(/[:\s{]/)[0] ?? "";
          if (!RESERVED_KEYS.has(innerKey.toLowerCase())) {
            hasChildNodesOrEdges = true;
          }
          depth += 1;
        } else if (inner === "}") {
          depth -= 1;
        } else if (depth === 1 && inner) {
          if (/->|<->|<-|--/.test(inner)) {
            hasChildNodesOrEdges = true;
          } else {
            const propKey = inner.split(":")[0]?.trim() ?? "";
            if (propKey && !RESERVED_KEYS.has(propKey.toLowerCase())) {
              hasChildNodesOrEdges = true;
            }
          }
        }
      }

      if (hasChildNodesOrEdges) {
        const groupId = uniqueDiagramId(key, usedIds);
        groups.push({
          id: groupId,
          label: rawLabel || key,
          parentId: currentGroupId(),
        });
        scopeStack.push({ key, isGroup: true, groupId });
      } else {
        const fullKey = resolveScopedKey(key);
        const node = ensureNode(fullKey, rawLabel || key, currentGroupId());
        scopeStack.push({ key, isGroup: false, nodeId: node.id });
      }
      continue;
    }

    const propMatch = line.match(
      /^([\p{L}\p{N}_.-]+)\s*:\s*(.+?)(?:\s*\{([^}]*)\})?$/u,
    );
    if (propMatch) {
      const key = propMatch[1].trim();
      const value = unquote(propMatch[2]);
      const inlineBody = propMatch[3] ?? "";

      const topScope = scopeStack[scopeStack.length - 1];
      if (key.toLowerCase() === "shape" && topScope?.nodeId) {
        const targetNode = ir.nodes.find((entry) => entry.id === topScope.nodeId);
        if (targetNode) {
          targetNode.kind = mapD2ShapeToSemanticKind(value);
          targetNode.semantic = { ...targetNode.semantic, d2Shape: value };
        }
        continue;
      }

      if (key.toLowerCase() === "label" && topScope?.nodeId) {
        const targetNode = ir.nodes.find((entry) => entry.id === topScope.nodeId);
        if (targetNode) {
          targetNode.label = value;
        }
        continue;
      }

      if (RESERVED_KEYS.has(key.toLowerCase())) {
        continue;
      }

      const fullKey = resolveScopedKey(key);
      const node = ensureNode(fullKey, value || key, currentGroupId());
      const inlineShapeMatch = inlineBody.match(/shape\s*:\s*([\w-]+)/i);
      if (inlineShapeMatch) {
        node.kind = mapD2ShapeToSemanticKind(inlineShapeMatch[1]);
        node.semantic = { ...node.semantic, d2Shape: inlineShapeMatch[1] };
      }
      continue;
    }

    const bareMatch = line.match(/^([\p{L}\p{N}_-]+)$/u);
    if (bareMatch && !RESERVED_KEYS.has(bareMatch[1].toLowerCase())) {
      const fullKey = resolveScopedKey(bareMatch[1]);
      ensureNode(fullKey, bareMatch[1], currentGroupId());
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  if (ir.kind === "architecture") {
    ir.extras = {
      ...ir.extras,
      architectureServices: ir.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        group: node.groupId,
        icon:
          node.semantic?.d2Shape === "cylinder"
            ? "database"
            : node.semantic?.d2Shape === "cloud"
              ? "cloud"
              : "server",
      })),
    };
  }

  return ir;
}
