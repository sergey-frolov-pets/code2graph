import type {
  DiagramEdge,
  DiagramIR,
  DiagramNode,
} from "@/services/conversion/diagram-ir";

export interface DiagramGraphIndex {
  nodeById: Map<string, DiagramNode>;
  orderById: Map<string, number>;
  outgoing: Map<string, DiagramEdge[]>;
  incoming: Map<string, DiagramEdge[]>;
}

export interface DiagramHierarchyItem {
  id: string;
  label: string;
  level: number;
  parentId?: string;
}

export interface DiagramHierarchy {
  items: DiagramHierarchyItem[];
  treeEdges: DiagramEdge[];
  droppedEdgeCount: number;
  syntheticRootId?: string;
}

export const HIERARCHY_ROOT_LEVEL = 1;

const SYNTHETIC_ROOT_ID = "root";

/** Builds O(1) lookups so emitters and projectors avoid repeated `nodes.find` scans. */
export function buildGraphIndex(ir: DiagramIR): DiagramGraphIndex {
  const nodeById = new Map<string, DiagramNode>();
  const orderById = new Map<string, number>();
  const outgoing = new Map<string, DiagramEdge[]>();
  const incoming = new Map<string, DiagramEdge[]>();

  ir.nodes.forEach((node, index) => {
    nodeById.set(node.id, node);
    orderById.set(node.id, index);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  });

  for (const edge of ir.edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      continue;
    }
    outgoing.get(edge.source)!.push(edge);
    incoming.get(edge.target)!.push(edge);
  }

  return { nodeById, orderById, outgoing, incoming };
}

export function findRootNodeIds(
  ir: DiagramIR,
  index: DiagramGraphIndex = buildGraphIndex(ir),
): string[] {
  return ir.nodes
    .filter((node) =>
      (index.incoming.get(node.id) ?? []).every((edge) => edge.source === node.id),
    )
    .map((node) => node.id);
}

export function findSinkNodeIds(
  ir: DiagramIR,
  index: DiagramGraphIndex = buildGraphIndex(ir),
): string[] {
  return ir.nodes
    .filter((node) =>
      (index.outgoing.get(node.id) ?? []).every((edge) => edge.target === node.id),
    )
    .map((node) => node.id);
}

/**
 * Stable Kahn ordering: ties keep source order, cycles are broken at the
 * earliest remaining node with the fewest unresolved predecessors.
 */
export function orderNodesTopologically(
  ir: DiagramIR,
  index: DiagramGraphIndex = buildGraphIndex(ir),
): DiagramNode[] {
  const remainingInDegree = new Map<string, number>();
  for (const node of ir.nodes) {
    const selfLoops = (index.incoming.get(node.id) ?? []).filter(
      (edge) => edge.source === node.id,
    ).length;
    remainingInDegree.set(
      node.id,
      (index.incoming.get(node.id)?.length ?? 0) - selfLoops,
    );
  }

  const placed = new Set<string>();
  const ordered: DiagramNode[] = [];
  const ready: number[] = [];

  const pushReady = (position: number): void => {
    let insertAt = ready.length;
    while (insertAt > 0 && ready[insertAt - 1] > position) {
      insertAt -= 1;
    }
    ready.splice(insertAt, 0, position);
  };

  ir.nodes.forEach((node, position) => {
    if (remainingInDegree.get(node.id) === 0) {
      pushReady(position);
    }
  });

  while (ordered.length < ir.nodes.length) {
    if (ready.length === 0) {
      let bestPosition = -1;
      let bestDegree = Number.POSITIVE_INFINITY;
      ir.nodes.forEach((node, position) => {
        if (placed.has(node.id)) {
          return;
        }
        const degree = remainingInDegree.get(node.id) ?? 0;
        if (degree < bestDegree) {
          bestDegree = degree;
          bestPosition = position;
        }
      });
      pushReady(bestPosition);
    }

    const position = ready.shift()!;
    const node = ir.nodes[position];
    if (placed.has(node.id)) {
      continue;
    }
    placed.add(node.id);
    ordered.push(node);

    for (const edge of index.outgoing.get(node.id) ?? []) {
      if (placed.has(edge.target) || edge.target === node.id) {
        continue;
      }
      const next = (remainingInDegree.get(edge.target) ?? 0) - 1;
      remainingInDegree.set(edge.target, next);
      if (next === 0) {
        pushReady(index.orderById.get(edge.target)!);
      }
    }
  }

  return ordered;
}

export function buildRankMap(orderedNodes: readonly DiagramNode[]): Map<string, number> {
  return new Map(orderedNodes.map((node, rank) => [node.id, rank]));
}

/** Edges sorted by the flow rank of their source; parallel edges keep source order. */
export function orderEdgesByFlow(
  ir: DiagramIR,
  index: DiagramGraphIndex = buildGraphIndex(ir),
): DiagramEdge[] {
  const rank = buildRankMap(orderNodesTopologically(ir, index));
  return ir.edges
    .map((edge, position) => ({ edge, position }))
    .sort((left, right) => {
      const bySource =
        (rank.get(left.edge.source) ?? 0) - (rank.get(right.edge.source) ?? 0);
      return bySource !== 0 ? bySource : left.position - right.position;
    })
    .map((entry) => entry.edge);
}

export function collectReachable(
  startId: string,
  index: DiagramGraphIndex,
): Set<string> {
  const reached = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of index.outgoing.get(current) ?? []) {
      if (!reached.has(edge.target)) {
        reached.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return reached;
}

/**
 * Spanning tree for hierarchical kinds (mindmap/WBS): BFS from the natural
 * roots keeps the shallowest parent, disconnected parts hang off one root.
 */
export function buildHierarchy(
  ir: DiagramIR,
  rootLabel: string,
  index: DiagramGraphIndex = buildGraphIndex(ir),
): DiagramHierarchy {
  if (ir.nodes.length === 0) {
    return { items: [], treeEdges: [], droppedEdgeCount: ir.edges.length };
  }

  const roots = findRootNodeIds(ir, index);
  const parentById = new Map<string, string | undefined>();
  const childrenById = new Map<string, string[]>();
  const treeEdges: DiagramEdge[] = [];

  let rootId: string;
  let syntheticRootId: string | undefined;
  if (roots.length === 1) {
    rootId = roots[0];
  } else {
    const usedIds = new Set(ir.nodes.map((node) => node.id));
    syntheticRootId = SYNTHETIC_ROOT_ID;
    let suffix = 2;
    while (usedIds.has(syntheticRootId)) {
      syntheticRootId = `${SYNTHETIC_ROOT_ID}_${suffix}`;
      suffix += 1;
    }
    rootId = syntheticRootId;
  }

  parentById.set(rootId, undefined);
  childrenById.set(rootId, []);

  const attach = (childId: string, parentId: string, edge?: DiagramEdge): void => {
    parentById.set(childId, parentId);
    childrenById.set(childId, childrenById.get(childId) ?? []);
    childrenById.get(parentId)!.push(childId);
    treeEdges.push(
      edge ?? {
        id: `tree_${treeEdges.length + 1}`,
        source: parentId,
        target: childId,
        matchConfidence: 1,
      },
    );
  };

  const expandFrom = (startId: string): void => {
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of index.outgoing.get(current) ?? []) {
        if (parentById.has(edge.target)) {
          continue;
        }
        attach(edge.target, current, edge);
        queue.push(edge.target);
      }
    }
  };

  const seeds = syntheticRootId ? roots : [];
  if (!syntheticRootId) {
    expandFrom(rootId);
  }
  for (const seedId of [...seeds, ...ir.nodes.map((node) => node.id)]) {
    if (parentById.has(seedId)) {
      continue;
    }
    attach(seedId, rootId);
    expandFrom(seedId);
  }

  const labelOf = (id: string): string =>
    id === syntheticRootId ? rootLabel : index.nodeById.get(id)?.label ?? id;

  const items: DiagramHierarchyItem[] = [];
  const stack: Array<{ id: string; level: number }> = [
    { id: rootId, level: HIERARCHY_ROOT_LEVEL },
  ];
  while (stack.length > 0) {
    const { id, level } = stack.pop()!;
    items.push({ id, label: labelOf(id), level, parentId: parentById.get(id) });
    const children = childrenById.get(id) ?? [];
    for (let position = children.length - 1; position >= 0; position -= 1) {
      stack.push({ id: children[position], level: level + 1 });
    }
  }

  const treeEdgeIds = new Set(treeEdges.map((edge) => edge.id));
  const droppedEdgeCount = ir.edges.filter((edge) => !treeEdgeIds.has(edge.id)).length;

  return { items, treeEdges, droppedEdgeCount, syntheticRootId };
}
