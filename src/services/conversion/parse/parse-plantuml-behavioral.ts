import type { DiagramFormat } from "@/constants/diagram-formats";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  type DiagramNote,
  type DiagramSequenceBlock,
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
  const groups: DiagramGroup[] = [];
  const groupStack: string[] = [];
  const notes: DiagramNote[] = [];
  let inSkinBlock = false;
  let inNote = false;
  let inNoteTarget: string | undefined;
  let inNoteLines: string[] = [];

  function ensureState(
    rawRef: string,
    explicitLabel?: string,
    stereo?: string,
    groupId?: string,
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
          node.kind =
            stereo === "choice" || stereo === "fork" || stereo === "join"
              ? "decision"
              : node.kind;
          node.semantic = { ...node.semantic, stereotype: stereo };
        }
        if (groupId && !node.groupId) {
          node.groupId = groupId;
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
      kind:
        stereo === "choice" || stereo === "fork" || stereo === "join"
          ? "decision"
          : "default",
      groupId,
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

    if (/^title\s+/i.test(line)) {
      ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      continue;
    }

    if (inNote) {
      if (/^end\s*note\b/i.test(line)) {
        if (inNoteLines.length > 0) {
          notes.push({
            targetId: inNoteTarget,
            text: inNoteLines.join("\n"),
          });
        }
        inNote = false;
        inNoteTarget = undefined;
        inNoteLines = [];
      } else {
        inNoteLines.push(line);
      }
      continue;
    }

    if (inSkinBlock) {
      if (line === "}" || /<\/style>/i.test(line)) {
        inSkinBlock = false;
      }
      continue;
    }

    if (/^(?:skinparam|<style)\b/i.test(line)) {
      if (line.endsWith("{") || (/^<style\b/i.test(line) && !/<\/style>/i.test(line))) {
        inSkinBlock = true;
      }
      continue;
    }

    const inlineNoteMatch = line.match(
      /^note\s+(?:left|right|top|bottom)(?:\s+of\s+([\p{L}\p{N}_"-]+))?\s*:\s*(.+)$/iu,
    );
    if (inlineNoteMatch) {
      notes.push({
        targetId: inlineNoteMatch[1] ? unquote(inlineNoteMatch[1]) : undefined,
        text: inlineNoteMatch[2].replace(/\\n/g, "\n").trim(),
      });
      continue;
    }

    const blockNoteMatch = line.match(
      /^note\s+(?:left|right|top|bottom)(?:\s+of\s+([\p{L}\p{N}_"-]+))?\s*$/iu,
    );
    if (blockNoteMatch) {
      inNote = true;
      inNoteTarget = blockNoteMatch[1] ? unquote(blockNoteMatch[1]) : undefined;
      inNoteLines = [];
      continue;
    }

    if (line === "}") {
      groupStack.pop();
      continue;
    }

    const currentGroup = groupStack[groupStack.length - 1];

    const stateDecl = line.match(
      /^state\s+(?:"([^"]+)"|([\p{L}\p{N}_]+))(?:\s+as\s+([\p{L}\p{N}_]+))?(?:\s*<<\s*([^>]+?)\s*>>)?\s*(\{)?$/iu,
    );
    if (stateDecl) {
      const first = (stateDecl[1] || stateDecl[2] || "").trim();
      const alias = stateDecl[3]?.trim() || first;
      const stereo = stateDecl[4]?.trim().toLowerCase();
      const hasBrace = Boolean(stateDecl[5]);
      const id = ensureState(alias, first, stereo, currentGroup);
      registerAlias(aliasToId, first, id);
      if (hasBrace) {
        groups.push({
          id,
          label: first,
          parentId: currentGroup,
          kind: "composite",
        });
        groupStack.push(id);
      }
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
        const toId = ensureState(toRaw, undefined, undefined, currentGroup);
        const node = ir.nodes.find((entry) => entry.id === toId);
        if (node) {
          node.semantic = { ...node.semantic, isInitial: true };
        }
        continue;
      }

      if (toRaw === "[*]" && fromRaw !== "[*]") {
        const fromId = ensureState(fromRaw, undefined, undefined, currentGroup);
        const node = ir.nodes.find((entry) => entry.id === fromId);
        if (node) {
          node.semantic = { ...node.semantic, isFinal: true };
        }
        continue;
      }

      if (fromRaw === "[*]" || toRaw === "[*]") {
        continue;
      }

      const sourceId = ensureState(fromRaw, undefined, undefined, currentGroup);
      const targetId = ensureState(toRaw, undefined, undefined, currentGroup);
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
      const targetGroup =
        currentGroup && currentGroup === descMatch[1]
          ? groupStack[groupStack.length - 2]
          : currentGroup;
      const stateId = ensureState(descMatch[1], undefined, undefined, targetGroup);
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

  const populatedGroups = groups.filter((grp) =>
    ir.nodes.some((n) => n.groupId === grp.id && n.id !== grp.id),
  );
  if (populatedGroups.length > 0) {
    ir.groups = populatedGroups;
    const populatedIds = new Set(populatedGroups.map((g) => g.id));
    for (const node of ir.nodes) {
      if (node.groupId && !populatedIds.has(node.groupId)) {
        node.groupId = undefined;
      }
    }
  } else {
    for (const node of ir.nodes) {
      node.groupId = undefined;
    }
  }

  if (notes.length > 0) {
    ir.extras = { ...ir.extras, notes };
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
  const sequenceBlocks: DiagramSequenceBlock[] = [];
  const notes: DiagramNote[] = [];

  function ensureParticipant(
    rawKey: string,
    explicitLabel?: string,
    participantType = "participant",
    fill?: string,
  ): string {
    const cleanKey = unquote(rawKey);
    if (!cleanKey) {
      return "";
    }
    const existing =
      aliasToId.get(cleanKey) ?? aliasToId.get(cleanKey.toLowerCase());
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node) {
        if (explicitLabel && node.label === node.id) {
          node.label = explicitLabel;
        }
        if (fill && !node.visual?.fill) {
          node.visual = { ...node.visual, fill };
        }
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
      visual: fill ? { fill } : undefined,
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

    const dividerMatch = line.match(/^==\s*(.+?)\s*==$/);
    if (dividerMatch) {
      sequenceBlocks.push({
        type: "divider",
        label: dividerMatch[1].trim(),
        afterEdgeIndex: ir.edges.length - 1,
      });
      continue;
    }

    const blockMatch = line.match(/^(alt|else|opt|loop|par)\b(?:\s+(.*))?$/i);
    if (blockMatch) {
      sequenceBlocks.push({
        type: blockMatch[1].toLowerCase() as DiagramSequenceBlock["type"],
        label: blockMatch[2]?.trim(),
        afterEdgeIndex: ir.edges.length - 1,
      });
      continue;
    }

    const noteMatch = line.match(
      /^note\s+(?:left|right|over)(?:\s+of)?\s*([^:]*)\s*:\s*(.+)$/i,
    );
    if (noteMatch) {
      const targetRaw = noteMatch[1].split(",")[0]?.trim();
      const text = noteMatch[2].trim();
      notes.push({
        targetId: targetRaw ? unquote(targetRaw) : undefined,
        text,
      });
      sequenceBlocks.push({
        type: "note",
        label: text,
        afterEdgeIndex: ir.edges.length - 1,
      });
      continue;
    }

    const declMatch = line.match(
      /^(actor|participant|boundary|control|entity|database|queue|collections)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+)))?(?:\s+#(\w+))?$/iu,
    );
    if (declMatch) {
      const pType = declMatch[1];
      const first = (declMatch[2] || declMatch[3] || "").trim();
      const second = (declMatch[4] || declMatch[5] || "").trim();
      const colorToken = declMatch[6] ? `#${declMatch[6]}` : undefined;
      const quotedSecond = Boolean(declMatch[4]);
      const label = quotedSecond ? second : first;
      const alias = quotedSecond ? first : second || first;
      const id = ensureParticipant(alias, label, pType, colorToken);
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

  if (sequenceBlocks.length > 0 || notes.length > 0) {
    ir.extras = {
      ...ir.extras,
      sequenceBlocks: sequenceBlocks.length > 0 ? sequenceBlocks : undefined,
      notes: notes.length > 0 ? notes : undefined,
    };
  }

  return ir;
}

interface BranchContext {
  kind: "if" | "fork";
  originId: string;
  branchTips: Array<{ id: string; label?: string }>;
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
  let activeTips: Array<{ id: string; label?: string }> = [];
  const branchStack: BranchContext[] = [];
  let inSkinBlock = false;

  function connectActiveTipsTo(targetId: string): void {
    for (const tip of activeTips) {
      if (tip.id && tip.id !== targetId) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: tip.id,
          target: targetId,
          label: tip.label,
          matchConfidence: 1,
        });
      }
    }
  }

  function addStepNode(
    label: string,
    kind: DiagramNode["kind"] = "default",
    fill?: string,
  ): string {
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      kind,
      groupId: currentGroupId,
      visual: fill ? { fill } : undefined,
      matchConfidence: 1,
    });
    connectActiveTipsTo(id);
    activeTips = [{ id }];
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

    if (inSkinBlock) {
      if (line === "}" || /<\/style>/i.test(line)) {
        inSkinBlock = false;
      }
      continue;
    }
    if (/^(?:skinparam|<style)\b/i.test(line)) {
      if (line.endsWith("{") || (/^<style\b/i.test(line) && !/<\/style>/i.test(line))) {
        inSkinBlock = true;
      }
      continue;
    }

    const swimlaneMatch = line.match(/^\|(?:#([A-Za-z0-9]+)\|)?([^|]+)\|$/);
    if (swimlaneMatch) {
      const laneColor = swimlaneMatch[1];
      const laneName = swimlaneMatch[2].trim();
      let grp = groups.find((entry) => entry.label === laneName);
      if (!grp) {
        grp = {
          id: uniqueDiagramId(laneName, usedIds),
          label: laneName,
          fill: laneColor ? `#${laneColor}` : undefined,
          kind: "swimlane",
        };
        groups.push(grp);
      } else if (laneColor && !grp.fill) {
        grp.fill = `#${laneColor}`;
      }
      currentGroupId = grp.id;
      continue;
    }

    if (/^(?:stop|end|kill|detach)\s*$/i.test(line)) {
      activeTips = [];
      continue;
    }

    const ifMatch = line.match(
      /^if\s*\(([^)]+)\)\s*(?:then\s*(?:\(([^)]+)\))?)?/i,
    );
    if (ifMatch) {
      const decId = addStepNode(ifMatch[1].trim(), "decision");
      const thenLabel = ifMatch[2]?.trim();
      branchStack.push({
        kind: "if",
        originId: decId,
        branchTips: [],
      });
      activeTips = [{ id: decId, label: thenLabel }];
      continue;
    }

    const elseifMatch = line.match(
      /^elseif\s*\(([^)]+)\)\s*(?:then\s*(?:\(([^)]+)\))?)?/i,
    );
    if (elseifMatch) {
      const top = branchStack[branchStack.length - 1];
      if (top && top.kind === "if") {
        top.branchTips.push(...activeTips);
        activeTips = [{ id: top.originId, label: "no" }];
        const nextDec = addStepNode(elseifMatch[1].trim(), "decision");
        top.originId = nextDec;
        activeTips = [{ id: nextDec, label: elseifMatch[2]?.trim() }];
      }
      continue;
    }

    const elseMatch = line.match(/^else\s*(?:\(([^)]+)\))?/i);
    if (elseMatch) {
      const top = branchStack[branchStack.length - 1];
      if (top && top.kind === "if") {
        top.branchTips.push(...activeTips);
        activeTips = [{ id: top.originId, label: elseMatch[1]?.trim() || "else" }];
      } else {
        const decisionNode = [...ir.nodes]
          .reverse()
          .find((node) => node.kind === "decision");
        if (decisionNode) {
          activeTips = [{ id: decisionNode.id, label: elseMatch[1]?.trim() || "else" }];
        }
      }
      continue;
    }

    if (/^endif\b/i.test(line)) {
      const top = branchStack.pop();
      if (top && top.kind === "if") {
        activeTips = [...top.branchTips, ...activeTips];
      }
      continue;
    }

    if (/^fork\s*$/i.test(line)) {
      const originId = activeTips[0]?.id ?? "";
      branchStack.push({
        kind: "fork",
        originId,
        branchTips: [],
      });
      continue;
    }

    if (/^fork\s+again\s*$/i.test(line)) {
      const top = branchStack[branchStack.length - 1];
      if (top && top.kind === "fork") {
        top.branchTips.push(...activeTips);
        activeTips = top.originId ? [{ id: top.originId }] : [];
      }
      continue;
    }

    if (/^end\s+fork\b|^end\s+merge\b/i.test(line)) {
      const top = branchStack.pop();
      if (top && top.kind === "fork") {
        activeTips = [...top.branchTips, ...activeTips];
      }
      continue;
    }

    const stepMatch = line.match(/^:\s*([^;]+);\s*(?:<<#([A-Za-z0-9]+)>>)?/);
    if (stepMatch) {
      const fill = stepMatch[2] ? `#${stepMatch[2]}` : undefined;
      addStepNode(stepMatch[1].trim(), "default", fill);
    }
  }

  const populatedGroups = groups.filter((grp) =>
    ir.nodes.some((n) => n.groupId === grp.id),
  );
  if (populatedGroups.length > 0) {
    ir.groups = populatedGroups;
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
