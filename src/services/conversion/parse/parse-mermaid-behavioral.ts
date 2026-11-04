import type { DiagramFormat } from "@/constants/diagram-formats";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramEntityAttribute,
  type DiagramIR,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { unquote } from "@/services/conversion/parse/parse-mermaid-structural";

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
