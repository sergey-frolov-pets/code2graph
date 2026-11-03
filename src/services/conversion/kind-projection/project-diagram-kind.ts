import {
  cloneDiagramIr,
  uniqueDiagramId,
  type DiagramChartData,
  type DiagramClassMember,
  type DiagramEdge,
  type DiagramEntityAttribute,
  type DiagramIR,
  type DiagramKind,
  type DiagramNode,
  type DiagramSlice,
  type DiagramTimelineEvent,
} from "@/services/conversion/diagram-ir";
import {
  buildGraphIndex,
  buildHierarchy,
  findRootNodeIds,
  findSinkNodeIds,
  orderEdgesByFlow,
  orderNodesTopologically,
  type DiagramHierarchyItem,
} from "@/services/conversion/graph/graph-analysis";

export const PROJECTION_START_LABEL = "Start";
export const PROJECTION_END_LABEL = "End";
export const PROJECTION_DEFAULT_ROOT_LABEL = "Diagram";
export const PROJECTION_DEFAULT_MESSAGE_LABEL = "message";
export const PROJECTION_INHERITANCE_LABEL = "is a";
export const PROJECTION_DEFAULT_ATTRIBUTE_TYPE = "string";
export const PROJECTION_DEFAULT_TASK_DURATION = "1d";

const PRIMARY_KEY_NAME = /^(?:id|uuid|pk)$/i;
const FOREIGN_KEY_NAME = /(?:_id|Id)$/;
const DATABASE_LABEL = /db|database|sql|storage|база|бд|хранилище/i;
const PERSON_LABEL = /^(?:user|customer|client|admin|operator|actor|пользователь|клиент|администратор|оператор)s?$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_ER_CARDINALITY = "||--o{";
const ONE_TO_ONE_ER_CARDINALITY = "||--||";

export interface DiagramKindProjection {
  ir: DiagramIR;
  droppedEdgeCount: number;
}

interface ProjectionContext {
  source: DiagramIR;
  usedIds: Set<string>;
}

function createContext(source: DiagramIR): ProjectionContext {
  return { source, usedIds: new Set(source.nodes.map((node) => node.id)) };
}

function withKind(ir: DiagramIR, kind: DiagramKind, extras: DiagramIR["extras"] = {}): DiagramIR {
  return {
    ...ir,
    kind,
    extras: { ...(ir.extras?.title ? { title: ir.extras.title } : {}), ...extras },
  };
}

function nextEdgeId(edges: readonly DiagramEdge[]): string {
  return `e${edges.length + 1}`;
}

function rootLabelOf(ir: DiagramIR): string {
  return ir.extras?.title || ir.extras?.systemBoundary || PROJECTION_DEFAULT_ROOT_LABEL;
}

function isDatabaseNode(node: DiagramNode): boolean {
  const c4Type = String(node.semantic?.c4Type ?? "").toLowerCase();
  const d2Shape = String(node.semantic?.d2Shape ?? "").toLowerCase();
  return c4Type.includes("db") || d2Shape === "cylinder" || DATABASE_LABEL.test(node.label);
}

function isPersonNode(node: DiagramNode): boolean {
  const c4Type = String(node.semantic?.c4Type ?? "").toLowerCase();
  return node.kind === "actor" || c4Type.startsWith("person") || PERSON_LABEL.test(node.label.trim());
}

function isExternalNode(node: DiagramNode): boolean {
  return String(node.semantic?.c4Type ?? "").toLowerCase().includes("_ext");
}

/** Linear chain for kinds that only keep order (gantt, timeline, journey). */
function chainEdges(nodes: readonly DiagramNode[]): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  for (let position = 1; position < nodes.length; position += 1) {
    edges.push({
      id: nextEdgeId(edges),
      source: nodes[position - 1].id,
      target: nodes[position].id,
      matchConfidence: 1,
    });
  }
  return edges;
}

function hierarchyFromItems(
  items: ReadonlyArray<{ level: number; label: string }>,
  usedIds: Set<string>,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const parentStack: Array<{ level: number; id: string }> = [];
  for (const item of items) {
    const id = uniqueDiagramId(item.label, usedIds);
    nodes.push({ id, label: item.label, matchConfidence: 1 });
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= item.level) {
      parentStack.pop();
    }
    const parent = parentStack[parentStack.length - 1];
    if (parent) {
      edges.push({ id: nextEdgeId(edges), source: parent.id, target: id, matchConfidence: 1 });
    }
    parentStack.push({ level: item.level, id });
  }
  return { nodes, edges };
}

/** State initial/final markers become explicit start/end nodes so flow kinds keep them. */
function materializeStateMarkers(context: ProjectionContext): DiagramIR {
  const ir = cloneDiagramIr(context.source);
  const initial = ir.nodes.filter((node) => node.semantic?.isInitial);
  const finals = ir.nodes.filter((node) => node.semantic?.isFinal);

  for (const node of ir.nodes) {
    if (node.semantic?.stereotype === "choice") {
      node.kind = "decision";
    }
  }

  if (initial.length > 0) {
    const startId = uniqueDiagramId("start", context.usedIds);
    ir.nodes.unshift({ id: startId, label: PROJECTION_START_LABEL, kind: "start", matchConfidence: 1 });
    for (const node of initial) {
      ir.edges.push({ id: nextEdgeId(ir.edges), source: startId, target: node.id, matchConfidence: 1 });
    }
  }
  if (finals.length > 0) {
    const endId = uniqueDiagramId("end", context.usedIds);
    ir.nodes.push({ id: endId, label: PROJECTION_END_LABEL, kind: "end", matchConfidence: 1 });
    for (const node of finals) {
      ir.edges.push({ id: nextEdgeId(ir.edges), source: node.id, target: endId, matchConfidence: 1 });
    }
  }
  return ir;
}

function sequenceToGraph(context: ProjectionContext): DiagramIR {
  const ir = cloneDiagramIr(context.source);
  ir.edges = ir.edges.map((edge, position) => ({
    ...edge,
    label: `${position + 1}. ${edge.label || PROJECTION_DEFAULT_MESSAGE_LABEL}`,
    kind: edge.semantic?.dashed ? "dashed" : "arrow",
  }));
  return withKind(ir, "graph");
}

function sequenceToActivity(context: ProjectionContext): DiagramIR {
  const source = context.source;
  const participantById = new Map(source.nodes.map((node) => [node.id, node]));
  const nodes: DiagramNode[] = [];
  const laneIds = new Set<string>();
  const usedIds = new Set<string>();

  source.edges.forEach((edge, position) => {
    const targetLabel = participantById.get(edge.target)?.label ?? edge.target;
    const message = edge.label || PROJECTION_DEFAULT_MESSAGE_LABEL;
    laneIds.add(edge.source);
    nodes.push({
      id: uniqueDiagramId(`step_${position + 1}`, usedIds),
      label: `${message} → ${targetLabel}`,
      groupId: edge.source,
      matchConfidence: 1,
    });
  });

  return {
    ...withKind(source, "activity"),
    nodes,
    edges: chainEdges(nodes),
    groups: source.nodes
      .filter((node) => laneIds.has(node.id))
      .map((node) => ({ id: node.id, label: node.label })),
  };
}

function hierarchyToGraph(context: ProjectionContext): DiagramIR {
  const source = context.source;
  if (source.edges.length > 0 || !source.extras?.wbsItems?.length) {
    return withKind(cloneDiagramIr(source), "graph");
  }
  const { nodes, edges } = hierarchyFromItems(source.extras.wbsItems, new Set());
  return { ...withKind(source, "graph"), nodes, edges };
}

function ganttToGraph(context: ProjectionContext): DiagramIR {
  const ir = cloneDiagramIr(context.source);
  if (ir.edges.length === 0) {
    ir.edges = chainEdges(ir.nodes);
  }
  ir.nodes = ir.nodes.map((node): DiagramNode => ({
    ...node,
    kind: node.semantic?.milestone ? "decision" : "task",
  }));
  return withKind(ir, "graph");
}

function projectToGraph(context: ProjectionContext): DiagramIR {
  switch (context.source.kind) {
    case "state":
      return withKind(materializeStateMarkers(context), "graph");
    case "sequence":
      return sequenceToGraph(context);
    case "mindmap":
    case "wbs":
      return hierarchyToGraph(context);
    case "gantt":
      return ganttToGraph(context);
    default: {
      const ir = cloneDiagramIr(context.source);
      ir.nodes = ir.nodes.map((node): DiagramNode => ({
        ...node,
        kind: node.kind === "class" || node.kind === "field" ? "default" : node.kind,
      }));
      return withKind(ir, "graph");
    }
  }
}

function projectToActivity(context: ProjectionContext): DiagramIR {
  switch (context.source.kind) {
    case "state":
      return withKind(materializeStateMarkers(context), "activity");
    case "sequence":
      return sequenceToActivity(context);
    default:
      return withKind(cloneDiagramIr(context.source), "activity");
  }
}

/** Start/end pseudo-nodes collapse into initial/final markers; roots and sinks are the fallback. */
function projectToState(context: ProjectionContext): DiagramIR {
  const source = cloneDiagramIr(context.source);
  const index = buildGraphIndex(source);
  const markerIds = new Set(
    source.nodes
      .filter((node) => node.kind === "start" || node.kind === "end")
      .map((node) => node.id),
  );
  const initialIds = new Set<string>();
  const finalIds = new Set<string>();

  for (const node of source.nodes) {
    if (node.kind === "start") {
      for (const edge of index.outgoing.get(node.id) ?? []) {
        if (!markerIds.has(edge.target)) {
          initialIds.add(edge.target);
        }
      }
    }
    if (node.kind === "end") {
      for (const edge of index.incoming.get(node.id) ?? []) {
        if (!markerIds.has(edge.source)) {
          finalIds.add(edge.source);
        }
      }
    }
  }

  const nodes = source.nodes.filter((node) => !markerIds.has(node.id));
  const edges = source.edges.filter(
    (edge) => !markerIds.has(edge.source) && !markerIds.has(edge.target),
  );
  const projected: DiagramIR = { ...withKind(source, "state"), nodes, edges, groups: [] };
  const projectedIndex = buildGraphIndex(projected);

  if (initialIds.size === 0) {
    const roots = findRootNodeIds(projected, projectedIndex);
    const fallback = roots[0] ?? nodes[0]?.id;
    if (fallback) {
      initialIds.add(fallback);
    }
  }
  if (finalIds.size === 0) {
    for (const sinkId of findSinkNodeIds(projected, projectedIndex)) {
      if (!initialIds.has(sinkId) || nodes.length === 1) {
        finalIds.add(sinkId);
      }
    }
  }

  projected.nodes = nodes.map((node) => {
    const semantic: Record<string, unknown> = {};
    if (initialIds.has(node.id)) {
      semantic.isInitial = true;
    }
    if (finalIds.has(node.id)) {
      semantic.isFinal = true;
    }
    if (node.kind === "decision") {
      semantic.stereotype = "choice";
    }
    return { id: node.id, label: node.label, semantic, matchConfidence: node.matchConfidence };
  });
  return projected;
}

/** Participants follow flow order so the first message reads left to right. */
function projectToSequence(context: ProjectionContext): DiagramIR {
  const source = cloneDiagramIr(context.source);
  const index = buildGraphIndex(source);
  const participants = orderNodesTopologically(source, index).map((node): DiagramNode => ({
    id: node.id,
    label: node.label,
    kind: node.kind === "actor" ? "actor" : undefined,
    semantic: { participantType: node.kind === "actor" ? "actor" : "participant" },
    matchConfidence: node.matchConfidence,
  }));
  const messages = orderEdgesByFlow(source, index).map((edge, position): DiagramEdge => ({
    id: `e${position + 1}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    kind: "message",
    semantic: { dashed: edge.kind === "dashed" },
    matchConfidence: edge.matchConfidence,
  }));
  return { ...withKind(source, "sequence"), nodes: participants, edges: messages, groups: [] };
}

function projectToHierarchy(
  context: ProjectionContext,
  kind: "mindmap" | "wbs",
): DiagramKindProjection {
  const source = context.source;
  const existingItems = source.extras?.wbsItems;
  if ((source.kind === "mindmap" || source.kind === "wbs") && existingItems?.length) {
    return {
      ir: withKind(cloneDiagramIr(source), kind, { wbsItems: existingItems }),
      droppedEdgeCount: 0,
    };
  }

  const hierarchy = buildHierarchy(source, rootLabelOf(source));
  const nodes: DiagramNode[] = hierarchy.items.map((item: DiagramHierarchyItem) => ({
    id: item.id,
    label: item.label,
    matchConfidence: 1,
  }));
  const edges = hierarchy.treeEdges.map((edge, position) => ({
    id: `e${position + 1}`,
    source: edge.source,
    target: edge.target,
    matchConfidence: 1,
  }));
  return {
    ir: {
      ...withKind(source, kind, {
        wbsItems: hierarchy.items.map((item) => ({ level: item.level, label: item.label })),
      }),
      nodes,
      edges,
      groups: [],
    },
    droppedEdgeCount: hierarchy.droppedEdgeCount,
  };
}

const MULTIPLICITY_TO_CROWS_FOOT: Record<string, { left: string; right: string }> = {
  "1": { left: "||", right: "||" },
  "0..1": { left: "|o", right: "o|" },
  "*": { left: "}o", right: "o{" },
  "0..*": { left: "}o", right: "o{" },
  "1..*": { left: "}|", right: "|{" },
  n: { left: "}o", right: "o{" },
};

function toErCardinality(edge: DiagramEdge): string {
  if (edge.kind === "inherit") {
    return ONE_TO_ONE_ER_CARDINALITY;
  }
  const sourceCard = MULTIPLICITY_TO_CROWS_FOOT[String(edge.semantic?.sourceCardinality ?? "")];
  const targetCard = MULTIPLICITY_TO_CROWS_FOOT[String(edge.semantic?.targetCardinality ?? "")];
  if (!sourceCard && !targetCard) {
    return DEFAULT_ER_CARDINALITY;
  }
  return `${sourceCard?.left ?? "||"}--${targetCard?.right ?? "o{"}`;
}

function projectToEr(context: ProjectionContext): DiagramIR {
  const source = cloneDiagramIr(context.source);
  const entityAttributes: Record<string, DiagramEntityAttribute[]> = {};
  for (const node of source.nodes) {
    const fields = (source.extras?.classMembers?.[node.id] ?? []).filter((member) => !member.isMethod);
    if (fields.length === 0) {
      continue;
    }
    entityAttributes[node.id] = fields.map((member) => ({
      name: member.name,
      type: member.type || PROJECTION_DEFAULT_ATTRIBUTE_TYPE,
      isPrimaryKey: PRIMARY_KEY_NAME.test(member.name),
      isForeignKey: FOREIGN_KEY_NAME.test(member.name),
    }));
  }
  const edges = source.edges.map((edge): DiagramEdge => ({
    ...edge,
    kind: "relation",
    label: edge.label || (edge.kind === "inherit" ? PROJECTION_INHERITANCE_LABEL : undefined),
    semantic: { cardinality: toErCardinality(edge) },
  }));
  return {
    ...withKind(source, "er", { entityAttributes }),
    nodes: source.nodes.map((node): DiagramNode => ({ ...node, kind: "default" })),
    edges,
  };
}

function projectToClass(context: ProjectionContext): DiagramIR {
  const source = cloneDiagramIr(context.source);
  const classMembers: Record<string, DiagramClassMember[]> = {};
  for (const node of source.nodes) {
    const attributes = source.extras?.entityAttributes?.[node.id];
    const objectFields = source.extras?.objectFields?.[node.id];
    if (attributes?.length) {
      classMembers[node.id] = attributes.map((attribute) => ({
        visibility: attribute.isPrimaryKey ? "+" : "-",
        name: attribute.name,
        type: attribute.type,
      }));
    } else if (objectFields?.length) {
      classMembers[node.id] = objectFields.map((field) => ({
        visibility: "+",
        name: field.name,
      }));
    }
  }
  return {
    ...withKind(source, "class", { classMembers }),
    nodes: source.nodes.map((node): DiagramNode => ({ ...node, kind: "class" })),
    edges: source.edges.map((edge): DiagramEdge => ({
      ...edge,
      kind: edge.kind === "inherit" ? "inherit" : "arrow",
      semantic: {},
    })),
  };
}

function resolveC4Type(node: DiagramNode, targetKind: DiagramKind): string {
  if (isPersonNode(node)) {
    return isExternalNode(node) ? "Person_Ext" : "Person";
  }
  const database = isDatabaseNode(node);
  if (targetKind === "c4_context" || isExternalNode(node)) {
    const base = database ? "SystemDb" : "System";
    return isExternalNode(node) ? `${base}_Ext` : base;
  }
  return database ? "ContainerDb" : "Container";
}

function projectToC4(context: ProjectionContext, kind: "c4_context" | "c4_container"): DiagramIR {
  const source = cloneDiagramIr(context.source);
  return {
    ...withKind(source, kind, {
      systemBoundary: source.extras?.systemBoundary ?? source.groups?.[0]?.label,
    }),
    nodes: source.nodes.map((node): DiagramNode => {
      const c4Type = resolveC4Type(node, kind);
      return {
        ...node,
        kind: c4Type.startsWith("Person") ? "actor" : c4Type.startsWith("Container") ? "container" : "system",
        semantic: { ...node.semantic, c4Type },
      };
    }),
    groups: kind === "c4_context" ? [] : source.groups,
  };
}

function projectToDeployment(context: ProjectionContext): DiagramIR {
  const source = cloneDiagramIr(context.source);
  return {
    ...withKind(source, "deployment"),
    nodes: source.nodes.map((node): DiagramNode => {
      const database = isDatabaseNode(node);
      return {
        ...node,
        kind: database ? "system" : isPersonNode(node) ? "actor" : "default",
        semantic: { ...node.semantic, ...(database ? { d2Shape: "cylinder" } : {}) },
      };
    }),
  };
}

function chartValues(chart: DiagramChartData | undefined): number[] {
  return chart?.bar ?? chart?.line ?? [];
}

function projectToPie(context: ProjectionContext): DiagramIR {
  const source = context.source;
  const chart = source.extras?.chartData;
  const values = chartValues(chart);
  const labels = chart?.xLabels ?? source.nodes.map((node) => node.label);
  const slices: DiagramSlice[] = labels
    .map((label, position) => ({ label, value: values[position] ?? 0 }))
    .filter((slice) => slice.value > 0);
  return { ...withKind(cloneDiagramIr(source), "pie", { slices }), edges: [] };
}

function projectToXychart(context: ProjectionContext): DiagramIR {
  const source = context.source;
  const slices = source.extras?.slices ?? [];
  const chartData: DiagramChartData = {
    xLabels: slices.map((slice) => slice.label),
    yAxis: source.extras?.title,
    yMin: 0,
    bar: slices.map((slice) => slice.value),
  };
  return { ...withKind(cloneDiagramIr(source), "xychart", { chartData }), edges: [] };
}

function projectToTimeline(context: ProjectionContext): DiagramIR {
  const source = context.source;
  let timelineEvents: DiagramTimelineEvent[];
  if (source.kind === "journey" && source.extras?.journeyTasks?.length) {
    timelineEvents = source.extras.journeyTasks.map((task) => ({
      date: task.section || rootLabelOf(source),
      event: task.action,
    }));
  } else {
    timelineEvents = source.nodes.map((node, position) => ({
      date: String(node.semantic?.startDate ?? node.semantic?.duration ?? position + 1),
      event: node.label,
      section: node.semantic?.section ? String(node.semantic.section) : undefined,
    }));
  }
  return { ...withKind(cloneDiagramIr(source), "timeline", { timelineEvents }), groups: [] };
}

function projectToGantt(context: ProjectionContext): DiagramIR {
  const source = context.source;
  const events = source.extras?.timelineEvents ?? source.nodes.map((node) => ({
    date: String(node.semantic?.date ?? ""),
    event: node.label,
    section: undefined as string | undefined,
  }));
  const usedIds = new Set<string>();
  const nodes: DiagramNode[] = events.map((event, position) => ({
    id: uniqueDiagramId(`task_${position + 1}`, usedIds),
    label: event.date && !ISO_DATE.test(event.date) ? `${event.date} ${event.event}` : event.event,
    kind: "task",
    semantic: {
      duration: PROJECTION_DEFAULT_TASK_DURATION,
      ...(event.section ? { section: event.section } : {}),
      ...(ISO_DATE.test(event.date) ? { startDate: event.date } : {}),
    },
    matchConfidence: 1,
  }));
  return { ...withKind(source, "gantt"), nodes, edges: chainEdges(nodes), groups: [] };
}

/**
 * Re-shapes a parsed IR into another diagram kind. Callers must check
 * relevance with `getKindProjectionRule` first; unknown pairs fall back to a
 * plain kind relabel.
 */
export function projectDiagramKind(
  ir: DiagramIR,
  targetKind: DiagramKind,
): DiagramKindProjection {
  if (ir.kind === targetKind) {
    return { ir, droppedEdgeCount: 0 };
  }

  const context = createContext(ir);
  const project = (): DiagramIR | DiagramKindProjection => {
    switch (targetKind) {
      case "graph":
        return projectToGraph(context);
      case "activity":
        return projectToActivity(context);
      case "state":
        return projectToState(context);
      case "sequence":
        return projectToSequence(context);
      case "mindmap":
      case "wbs":
        return projectToHierarchy(context, targetKind);
      case "er":
        return projectToEr(context);
      case "class":
        return projectToClass(context);
      case "c4_context":
      case "c4_container":
        return projectToC4(context, targetKind);
      case "deployment":
        return projectToDeployment(context);
      case "pie":
        return projectToPie(context);
      case "xychart":
        return projectToXychart(context);
      case "timeline":
        return projectToTimeline(context);
      case "gantt":
        return projectToGantt(context);
      default:
        return withKind(cloneDiagramIr(ir), targetKind);
    }
  };

  const result = project();
  const projection = "droppedEdgeCount" in result
    ? result
    : { ir: result, droppedEdgeCount: 0 };
  return {
    ...projection,
    ir: {
      ...projection.ir,
      metadata: { ...ir.metadata },
    },
  };
}
