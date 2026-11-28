import type { AgentDiagramType } from "./agent-diagram.js";

/**
 * Complexity budget: a per-type ceiling on how much one diagram may carry.
 * Derived from the layout budget rules (sequence ≤5 lifelines, ER ≤8 entities,
 * swimlane ≤5 lanes, tree depth ≤4, steps ≤7, dependency 9 nodes / 14 edges).
 */
export interface DiagramBudget {
  nodes?: number;
  edges?: number;
  lifelines?: number;
  entities?: number;
  lanes?: number;
  depth?: number;
  steps?: number;
}

export type DiagramComplexityMetric = keyof DiagramBudget;

export type DiagramComplexityCounts = DiagramBudget;

export interface DiagramBudgetViolation {
  metric: DiagramComplexityMetric;
  actual: number;
  limit: number;
}

export interface DiagramBudgetReport {
  type: AgentDiagramType;
  limits: DiagramBudget;
  violations: DiagramBudgetViolation[];
  warnings: string[];
}

export const DEFAULT_DIAGRAM_BUDGET: DiagramBudget = {
  nodes: 12,
  edges: 18,
  depth: 4,
};

export const DIAGRAM_BUDGETS: Partial<Record<AgentDiagramType, DiagramBudget>> = {
  sequence: { lifelines: 5, edges: 18 },
  er: { entities: 8, nodes: 8, edges: 14 },
  activity: { lanes: 5, steps: 7, nodes: 12 },
  flowchart: { lanes: 5, steps: 7, nodes: 12 },
  component: { nodes: 9, edges: 14 },
  class: { nodes: 9, edges: 14 },
  graph: { nodes: 9, edges: 14, depth: 4 },
  state: { nodes: 9, edges: 14 },
  mindmap: { nodes: 12, depth: 4 },
  deployment: { nodes: 9, edges: 14 },
  usecase: { nodes: 12, edges: 18 },
};

export function diagramBudgetFor(type: AgentDiagramType): DiagramBudget {
  return { ...DEFAULT_DIAGRAM_BUDGET, ...(DIAGRAM_BUDGETS[type] ?? {}) };
}

function metricWord(metric: DiagramComplexityMetric): string {
  switch (metric) {
    case "edges":
      return "connections";
    case "lifelines":
      return "lifelines";
    case "entities":
      return "entities";
    case "lanes":
      return "swimlanes";
    case "depth":
      return "depth levels";
    case "steps":
      return "steps";
    default:
      return "nodes";
  }
}

export function checkDiagramBudget(
  type: AgentDiagramType,
  counts: DiagramComplexityCounts,
): DiagramBudgetReport {
  const limits = diagramBudgetFor(type);
  const violations: DiagramBudgetViolation[] = [];

  for (const key of Object.keys(limits) as DiagramComplexityMetric[]) {
    const actual = counts[key];
    const limit = limits[key];
    if (limit === undefined || actual === undefined || !Number.isFinite(actual)) {
      continue;
    }
    if (actual > limit) {
      violations.push({ metric: key, actual, limit });
    }
  }

  const warnings = violations.map(
    ({ metric, actual, limit }) =>
      `${actual} ${metricWord(metric)} with a budget of ${limit} for a ${type} diagram — split it into an overview and a detail view.`,
  );

  return { type, limits, violations, warnings };
}

/** Counts from a graph-like structure (IR or any node/edge list). */
export function countsFromGraph(
  graph: { nodes?: readonly unknown[]; edges?: readonly unknown[] } | undefined,
): DiagramComplexityCounts {
  if (!graph) {
    return {};
  }

  const counts: DiagramComplexityCounts = {};
  if (Array.isArray(graph.nodes)) {
    counts.nodes = graph.nodes.length;
  }
  if (Array.isArray(graph.edges)) {
    counts.edges = graph.edges.length;
  }
  return counts;
}
