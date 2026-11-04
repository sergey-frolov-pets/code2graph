import type { DiagramFormat } from "@/constants/diagram-formats";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { registerAlias, unquote } from "@/services/conversion/parse/parse-plantuml-structural";

export function parseStatePlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("state");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();

  function ensureState(
    rawRef: string,
    explicitLabel?: string,
    stereo?: string,
  ): string {
    const clean = unquote(rawRef);
    if (!clean || clean === "[*]") {
      return "";
    }
    const existing = aliasToId.get(clean) ?? aliasToId.get(clean.toLowerCase());
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node) {
        if (explicitLabel && node.label === node.id) {
          node.label = explicitLabel;
        }
        if (stereo) {
          node.kind = stereo === "choice" ? "decision" : node.kind;
          node.semantic = { ...node.semantic, stereotype: stereo };
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(clean, usedIds);
    const label = explicitLabel || clean;
    registerAlias(aliasToId, clean, id);
    registerAlias(aliasToId, label, id);
    ir.nodes.push({
      id,
      label,
      kind: stereo === "choice" ? "decision" : "default",
      semantic: stereo ? { stereotype: stereo } : undefined,
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line) || /^!pragma/i.test(line)) {
      continue;
    }

    const stateDecl = line.match(
      /^state\s+(?:"([^"]+)"|([\p{L}\p{N}_]+))(?:\s+as\s+([\p{L}\p{N}_]+))?(?:\s*<<\s*([^>]+?)\s*>>)?(?:\s*\{)?$/iu,
    );
    if (stateDecl) {
      const first = (stateDecl[1] || stateDecl[2] || "").trim();
      const alias = stateDecl[3]?.trim() || first;
      const stereo = stateDecl[4]?.trim().toLowerCase();
      const id = ensureState(alias, first, stereo);
      registerAlias(aliasToId, first, id);
      continue;
    }

    const transMatch = line.match(
      /^(\[\*\]|"[^"]+"|[\p{L}\p{N}_]+)\s*-[-\w]*>\s*(\[\*\]|"[^"]+"|[\p{L}\p{N}_]+)(?:\s*:\s*(.+))?$/u,
    );
    if (transMatch) {
      const fromRaw = unquote(transMatch[1]);
      const toRaw = unquote(transMatch[2]);
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

    const descMatch = line.match(/^([\p{L}\p{N}_]+)\s*:\s*(.+)$/u);
    if (descMatch && !/^skinparam/i.test(line) && !/^note/i.test(line)) {
      const stateId = ensureState(descMatch[1]);
      const node = ir.nodes.find((entry) => entry.id === stateId);
      if (node) {
        const prevDesc = (node.semantic?.descriptions as string[] | undefined) ?? [];
        node.semantic = {
          ...node.semantic,
          descriptions: [...prevDesc, descMatch[2].trim()],
        };
      }
    }
  }

  return ir;
}

export function parseSequencePlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("sequence");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();

  function ensureParticipant(
    rawKey: string,
    explicitLabel?: string,
    participantType = "participant",
  ): string {
    const cleanKey = unquote(rawKey);
    if (!cleanKey) {
      return "";
    }
    const existing =
      aliasToId.get(cleanKey) ?? aliasToId.get(cleanKey.toLowerCase());
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node && explicitLabel && node.label === node.id) {
        node.label = explicitLabel;
      }
      return existing;
    }

    const id = uniqueDiagramId(cleanKey, usedIds);
    const label = explicitLabel || cleanKey;
    registerAlias(aliasToId, cleanKey, id);
    registerAlias(aliasToId, label, id);
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
    if (!line || /^@start/i.test(line) || /^@end/i.test(line) || /^!pragma/i.test(line)) {
      continue;
    }

    if (/^title\s+/i.test(line)) {
      ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      continue;
    }

    const declMatch = line.match(
      /^(actor|participant|boundary|control|entity|database|queue|collections)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+)))?(?:\s+#\w+)?$/iu,
    );
    if (declMatch) {
      const pType = declMatch[1];
      const first = (declMatch[2] || declMatch[3] || "").trim();
      const second = (declMatch[4] || declMatch[5] || "").trim();
      const quotedSecond = Boolean(declMatch[4]);
      const label = quotedSecond ? second : first;
      const alias = quotedSecond ? first : second || first;
      const id = ensureParticipant(alias, label, pType);
      registerAlias(aliasToId, first, id);
      if (second) {
        registerAlias(aliasToId, second, id);
      }
      continue;
    }

    const msgMatch = line.match(
      /^(?:"([^"]+)"|([\p{L}\p{N}_.-]+))\s*(-->>|->>|-->|->|<<--|<-|<--)\s*(?:"([^"]+)"|([\p{L}\p{N}_.-]+))\s*:\s*(.+)$/u,
    );
    if (msgMatch) {
      const leftRaw = (msgMatch[1] || msgMatch[2] || "").trim();
      const arrow = msgMatch[3];
      const rightRaw = (msgMatch[4] || msgMatch[5] || "").trim();
      const message = msgMatch[6].trim();

      const isLeftArrow = arrow.startsWith("<");
      const fromKey = isLeftArrow ? rightRaw : leftRaw;
      const toKey = isLeftArrow ? leftRaw : rightRaw;

      const sourceId = ensureParticipant(fromKey);
      const targetId = ensureParticipant(toKey);
      if (!sourceId || !targetId) {
        continue;
      }
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: message,
        kind: "message",
        semantic: { dashed: arrow.includes("--") },
        matchConfidence: 1,
      });
    }
  }

  return ir;
}

export function parseActivityPlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("activity");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const groups: DiagramGroup[] = [];
  let currentGroupId: string | undefined;
  let previousId: string | null = null;
  let pendingEdgeLabel: string | undefined;

  function addStepNode(
    label: string,
    kind: DiagramNode["kind"] = "default",
  ): string {
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      kind,
      groupId: currentGroupId,
      matchConfidence: 1,
    });
    if (previousId) {
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: previousId,
        target: id,
        label: pendingEdgeLabel,
        matchConfidence: 1,
      });
      pendingEdgeLabel = undefined;
    }
    previousId = id;
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line)) {
      continue;
    }

    const swimlaneMatch = line.match(/^\|(?:#[\w]+\|)?([^|]+)\|$/);
    if (swimlaneMatch) {
      const laneName = swimlaneMatch[1].trim();
      let grp = groups.find((entry) => entry.label === laneName);
      if (!grp) {
        grp = { id: uniqueDiagramId(laneName, usedIds), label: laneName };
        groups.push(grp);
      }
      currentGroupId = grp.id;
      continue;
    }

    const ifMatch = line.match(
      /^if\s*\(([^)]+)\)\s*(?:then\s*(?:\(([^)]+)\))?)?/i,
    );
    if (ifMatch) {
      addStepNode(ifMatch[1].trim(), "decision");
      pendingEdgeLabel = ifMatch[2]?.trim();
      continue;
    }

    const elseMatch = line.match(/^else\s*(?:\(([^)]+)\))?/i);
    if (elseMatch) {
      const decisionNode = [...ir.nodes]
        .reverse()
        .find((node) => node.kind === "decision");
      if (decisionNode) {
        previousId = decisionNode.id;
      }
      pendingEdgeLabel = elseMatch[1]?.trim() || "else";
      continue;
    }

    const stepMatch = line.match(/^:\s*([^;]+);/);
    if (stepMatch) {
      addStepNode(stepMatch[1].trim(), "default");
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

export function parseGanttPlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByLabel = new Map<string, string>();
  let previousId: string | null = null;

  const titleMatch = source.match(/^\s*title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { ...ir.extras, title: unquote(titleMatch[1]) };
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const lastsMatch = line.match(
      /^\[([^\]]+)\]\s+lasts\s+(\d+\s*\w+)(?:.*?starts\s+at\s+\[([^\]]+)\]'s\s+end)?/i,
    );
    if (lastsMatch) {
      const label = lastsMatch[1].trim();
      const duration = lastsMatch[2].trim();
      const depLabel = lastsMatch[3]?.trim();
      const id = uniqueDiagramId(label, usedIds);
      idByLabel.set(label, id);
      ir.nodes.push({
        id,
        label,
        kind: "task",
        semantic: { duration },
        matchConfidence: 1,
      });
      const fromId: string | null =
        (depLabel ? idByLabel.get(depLabel) ?? null : null) || previousId;
      if (fromId && fromId !== id) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: fromId,
          target: id,
          matchConfidence: 1,
        });
      }
      previousId = id;
      continue;
    }

    const happensMatch = line.match(
      /^\[([^\]]+)\]\s+happens\s+at\s+(?:\[([^\]]+)\]'s\s+end|(\S+))/i,
    );
    if (happensMatch) {
      const label = happensMatch[1].trim();
      const depLabel = happensMatch[2]?.trim();
      const startDate = happensMatch[3]?.trim();
      const id = uniqueDiagramId(label, usedIds);
      idByLabel.set(label, id);
      ir.nodes.push({
        id,
        label,
        kind: "task",
        semantic: { duration: "0d", startDate, milestone: true },
        matchConfidence: 1,
      });
      const fromId: string | null =
        (depLabel ? idByLabel.get(depLabel) ?? null : null) || previousId;
      if (fromId && fromId !== id) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: fromId,
          target: id,
          matchConfidence: 1,
        });
      }
      previousId = id;
    }
  }

  return ir;
}
