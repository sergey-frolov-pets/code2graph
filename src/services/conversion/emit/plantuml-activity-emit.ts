import type { DiagramEdge, DiagramIR, DiagramNode } from "@/services/conversion/diagram-ir";
import {
  buildGraphIndex,
  buildRankMap,
  orderNodesTopologically,
  type DiagramGraphIndex,
} from "@/services/conversion/graph/graph-analysis";
import {
  flattenPlantUmlLabel,
  formatPlantUmlActivityLabel,
} from "@/services/conversion/emit/plantuml-emit-utils";

const BRANCH_INDENT = "  ";
const DEFAULT_YES_LABEL = "yes";
const DEFAULT_NO_LABEL = "no";
const DEFAULT_REPEAT_LABEL = "repeat?";
const BACKWARD_LABEL_SEPARATOR = ", ";
const IF_ELSE_BRANCH_COUNT = 2;

function formatCondition(rawLabel: string): string {
  return flattenPlantUmlLabel(rawLabel).replace(/[()]/g, "").trim() || "?";
}

interface LoopCandidate {
  id: string;
  lineIndex: number;
  depth: number;
}

interface ActivityEmitContext {
  index: DiagramGraphIndex;
  rank: Map<string, number>;
  laneLabelById: Map<string, string>;
  emitted: Set<string>;
  lines: string[];
  /** Nodes emitted on the current path; a back edge to one at the same depth closes a `repeat`. */
  loopCandidates: LoopCandidate[];
  currentLaneId?: string;
}

function indentOf(depth: number): string {
  return BRANCH_INDENT.repeat(depth);
}

function pushLine(context: ActivityEmitContext, depth: number, text: string): void {
  context.lines.push(`${indentOf(depth)}${text}`);
}

function switchLane(context: ActivityEmitContext, node: DiagramNode): void {
  if (!node.groupId || node.groupId === context.currentLaneId) {
    return;
  }
  const laneLabel = context.laneLabelById.get(node.groupId);
  if (!laneLabel) {
    return;
  }
  context.currentLaneId = node.groupId;
  context.lines.push(`|${flattenPlantUmlLabel(laneLabel)}|`);
}

function forwardEdges(context: ActivityEmitContext, nodeId: string): DiagramEdge[] {
  return (context.index.outgoing.get(nodeId) ?? []).filter(
    (edge) => edge.target !== nodeId && !context.emitted.has(edge.target),
  );
}

function findOpenLoop(
  context: ActivityEmitContext,
  targetId: string,
  depth: number,
): number {
  for (let position = context.loopCandidates.length - 1; position >= 0; position -= 1) {
    const candidate = context.loopCandidates[position];
    if (candidate.depth < depth) {
      return -1;
    }
    if (candidate.id === targetId && candidate.depth === depth) {
      return position;
    }
  }
  return -1;
}

function findBackEdge(
  context: ActivityEmitContext,
  nodeId: string,
  depth: number,
): { edge: DiagramEdge; loopPosition: number } | undefined {
  for (const edge of context.index.outgoing.get(nodeId) ?? []) {
    if (!context.emitted.has(edge.target)) {
      continue;
    }
    const loopPosition = findOpenLoop(context, edge.target, depth);
    if (loopPosition >= 0) {
      return { edge, loopPosition };
    }
  }
  return undefined;
}

/** Inserts the deferred `repeat` at the loop header; inner unclosed candidates are discarded to keep nesting valid. */
function openRepeatAt(context: ActivityEmitContext, loopPosition: number): void {
  const candidate = context.loopCandidates[loopPosition];
  context.lines.splice(candidate.lineIndex, 0, `${indentOf(candidate.depth)}repeat`);
  context.loopCandidates.length = loopPosition;
}

/** Plain activities leading from `startId` straight to `targetId` (a loop body or a backward path). */
function findLinearChainTo(
  context: ActivityEmitContext,
  startId: string,
  targetId: string,
): DiagramNode[] | null {
  const chain: DiagramNode[] = [];
  let currentId = startId;
  while (currentId !== targetId) {
    const node = context.index.nodeById.get(currentId);
    if (
      !node ||
      context.emitted.has(currentId) ||
      node.kind === "decision" ||
      node.kind === "start" ||
      node.kind === "end" ||
      chain.includes(node)
    ) {
      return null;
    }
    const outgoing = (context.index.outgoing.get(currentId) ?? []).filter(
      (edge) => edge.target !== currentId,
    );
    if (outgoing.length !== 1) {
      return null;
    }
    chain.push(node);
    currentId = outgoing[0].target;
  }
  return chain;
}

/** First node (by flow rank) reachable from every branch without passing emitted nodes. */
function findMergeNodeId(
  context: ActivityEmitContext,
  branchTargets: readonly string[],
): string | undefined {
  const reachableSets = branchTargets.map((startId) => {
    const reached = new Set<string>([startId]);
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of context.index.outgoing.get(current) ?? []) {
        if (!reached.has(edge.target) && !context.emitted.has(edge.target)) {
          reached.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    return reached;
  });

  let mergeId: string | undefined;
  let mergeRank = Number.POSITIVE_INFINITY;
  for (const candidate of reachableSets[0]) {
    if (!reachableSets.every((set) => set.has(candidate))) {
      continue;
    }
    const candidateRank = context.rank.get(candidate) ?? Number.POSITIVE_INFINITY;
    if (candidateRank < mergeRank) {
      mergeRank = candidateRank;
      mergeId = candidate;
    }
  }
  return mergeId;
}

function emitChain(context: ActivityEmitContext, chain: readonly DiagramNode[], depth: number): void {
  for (const node of chain) {
    context.emitted.add(node.id);
    switchLane(context, node);
    pushLine(context, depth, `:${formatPlantUmlActivityLabel(node.label)};`);
  }
}

/**
 * Loop shapes at a two-way decision: a branch that returns to the decision
 * itself is a `while`, a branch that returns to an earlier open node is a
 * `repeat … backward … repeat while`. Returns the exit target or `null`.
 */
function tryEmitDecisionLoop(
  context: ActivityEmitContext,
  node: DiagramNode,
  edges: DiagramEdge[],
  depth: number,
): string | undefined | null {
  const condition = formatCondition(node.label);

  for (const [loopEdge, exitEdge] of [edges, [...edges].reverse()]) {
    const whileBody = findLinearChainTo(context, loopEdge.target, node.id);
    if (whileBody && whileBody.length > 0) {
      pushLine(context, depth, `while (${condition}) is (${formatCondition(loopEdge.label ?? DEFAULT_YES_LABEL)})`);
      emitChain(context, whileBody, depth + 1);
      pushLine(context, depth, `endwhile (${formatCondition(exitEdge.label ?? DEFAULT_NO_LABEL)})`);
      return exitEdge.target;
    }
  }

  for (const [loopEdge, exitEdge] of [edges, [...edges].reverse()]) {
    const candidates = context.loopCandidates;
    for (let position = candidates.length - 1; position >= 0; position -= 1) {
      const header = candidates[position];
      if (header.depth !== depth) {
        continue;
      }
      const backward = findLinearChainTo(context, loopEdge.target, header.id);
      if (!backward) {
        continue;
      }
      openRepeatAt(context, position);
      if (backward.length > 0) {
        backward.forEach((entry) => context.emitted.add(entry.id));
        const backwardLabel = backward
          .map((entry) => formatPlantUmlActivityLabel(entry.label))
          .join(BACKWARD_LABEL_SEPARATOR);
        pushLine(context, depth, `backward:${backwardLabel};`);
      }
      pushLine(
        context,
        depth,
        `repeat while (${condition}) is (${formatCondition(loopEdge.label ?? DEFAULT_YES_LABEL)}) not (${formatCondition(exitEdge.label ?? DEFAULT_NO_LABEL)})`,
      );
      return exitEdge.target;
    }
  }
  return null;
}

function emitBranches(
  context: ActivityEmitContext,
  node: DiagramNode,
  edges: DiagramEdge[],
  depth: number,
  stopIds: ReadonlySet<string>,
): string | undefined {
  if (node.kind === "decision" && edges.length === IF_ELSE_BRANCH_COUNT) {
    const loopExit = tryEmitDecisionLoop(context, node, edges, depth);
    if (loopExit !== null) {
      return loopExit;
    }
  }

  const mergeId = findMergeNodeId(context, edges.map((edge) => edge.target));
  const branchStops = new Set(stopIds);
  if (mergeId) {
    branchStops.add(mergeId);
  }
  const emitBranchBody = (edge: DiagramEdge): void => {
    if (edge.target !== mergeId) {
      emitSequence(context, edge.target, depth + 1, branchStops);
    }
  };

  if (node.kind !== "decision") {
    pushLine(context, depth, "fork");
    edges.forEach((edge, position) => {
      if (position > 0) {
        pushLine(context, depth, "fork again");
      }
      emitBranchBody(edge);
    });
    pushLine(context, depth, "end fork");
    return mergeId;
  }

  const condition = formatCondition(node.label);
  if (edges.length <= IF_ELSE_BRANCH_COUNT) {
    const [thenEdge, elseEdge] = edges;
    pushLine(context, depth, `if (${condition}) then (${formatCondition(thenEdge.label ?? DEFAULT_YES_LABEL)})`);
    emitBranchBody(thenEdge);
    if (elseEdge) {
      pushLine(context, depth, `else (${formatCondition(elseEdge.label ?? DEFAULT_NO_LABEL)})`);
      emitBranchBody(elseEdge);
    }
    pushLine(context, depth, "endif");
    return mergeId;
  }

  pushLine(context, depth, `switch (${condition})`);
  edges.forEach((edge, position) => {
    pushLine(context, depth, `case (${formatCondition(edge.label ?? String(position + 1))})`);
    emitBranchBody(edge);
  });
  pushLine(context, depth, "endswitch");
  return mergeId;
}

/** Back edge from `node` to an open header at this depth: emit `repeat while` and return the exit target. */
function tryCloseRepeat(
  context: ActivityEmitContext,
  node: DiagramNode,
  edges: DiagramEdge[],
  depth: number,
): string | undefined | null {
  if (edges.length > 1) {
    return null;
  }
  const back = findBackEdge(context, node.id, depth);
  if (!back) {
    return null;
  }
  openRepeatAt(context, back.loopPosition);
  const exitEdge = edges[0];
  if (node.kind === "decision") {
    pushLine(
      context,
      depth,
      `repeat while (${formatCondition(node.label)}) is (${formatCondition(back.edge.label ?? DEFAULT_YES_LABEL)}) not (${formatCondition(exitEdge?.label ?? DEFAULT_NO_LABEL)})`,
    );
  } else {
    pushLine(context, depth, `repeat while (${formatCondition(back.edge.label ?? DEFAULT_REPEAT_LABEL)})`);
  }
  return exitEdge?.target;
}

function emitSequence(
  context: ActivityEmitContext,
  startId: string,
  depth: number,
  stopIds: ReadonlySet<string>,
): void {
  const loopStackBase = context.loopCandidates.length;
  let currentId: string | undefined = startId;
  let pendingArrowLabel: string | undefined;

  while (currentId && !stopIds.has(currentId) && !context.emitted.has(currentId)) {
    const node = context.index.nodeById.get(currentId);
    if (!node) {
      break;
    }
    context.emitted.add(currentId);

    if (node.kind === "end") {
      pushLine(context, depth, "stop");
      break;
    }

    if (node.kind !== "start") {
      context.loopCandidates.push({ id: node.id, lineIndex: context.lines.length, depth });
      switchLane(context, node);
      if (pendingArrowLabel) {
        pushLine(context, depth, `-> ${formatPlantUmlActivityLabel(pendingArrowLabel)};`);
      }
      if (node.kind !== "decision") {
        pushLine(context, depth, `:${formatPlantUmlActivityLabel(node.label)};`);
      }
    }
    pendingArrowLabel = undefined;

    const edges = forwardEdges(context, currentId);
    const repeatExit = tryCloseRepeat(context, node, edges, depth);
    if (repeatExit !== null) {
      currentId = repeatExit;
      continue;
    }

    if (edges.length > 1 || (node.kind === "decision" && edges.length > 0)) {
      currentId = emitBranches(context, node, edges, depth, stopIds);
      continue;
    }

    const next = edges[0];
    pendingArrowLabel = next?.label;
    currentId = next?.target;
  }

  context.loopCandidates.length = Math.min(context.loopCandidates.length, loopStackBase);
}

function emitLinearActivity(ir: DiagramIR, laneLabelById: Map<string, string>): string[] {
  const lines = ["start"];
  let currentLaneId: string | undefined;
  for (const node of ir.nodes) {
    if (node.groupId && node.groupId !== currentLaneId && laneLabelById.has(node.groupId)) {
      currentLaneId = node.groupId;
      lines.push(`|${flattenPlantUmlLabel(laneLabelById.get(node.groupId)!)}|`);
    }
    lines.push(`:${formatPlantUmlActivityLabel(node.label)};`);
  }
  lines.push("stop");
  return lines;
}

/**
 * Rebuilds structured PlantUML activity syntax from the IR graph: decisions
 * become if/else, switch, while or repeat loops, parallel successors become
 * fork, and branches rejoin at their first common descendant.
 */
export function emitPlantUmlActivityBody(ir: DiagramIR): string[] {
  const laneLabelById = new Map(
    (ir.groups ?? []).map((group) => [group.id, group.label || group.id]),
  );

  if (ir.edges.length === 0) {
    return emitLinearActivity(ir, laneLabelById);
  }

  const index = buildGraphIndex(ir);
  const ordered = orderNodesTopologically(ir, index);
  const context: ActivityEmitContext = {
    index,
    rank: buildRankMap(ordered),
    laneLabelById,
    emitted: new Set<string>(),
    lines: [],
    loopCandidates: [],
  };

  const firstLaneNode = ordered.find(
    (node) => node.groupId && laneLabelById.has(node.groupId),
  );
  if (firstLaneNode) {
    switchLane(context, firstLaneNode);
  }
  context.lines.push("start");

  for (const node of ordered) {
    if (!context.emitted.has(node.id)) {
      emitSequence(context, node.id, 0, new Set<string>());
    }
  }

  if (context.lines[context.lines.length - 1] !== "stop") {
    context.lines.push("stop");
  }
  return context.lines;
}
