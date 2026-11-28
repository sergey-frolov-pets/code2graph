import {
  type DiagramBudget,
  type DiagramBudgetViolation,
  type DiagramComplexityCounts,
} from "./diagram-budget.js";

/**
 * Output handles: the caller says how big the picture is, how much detail it
 * may carry and who reads it. Nothing here edits the diagram — `detail` only
 * reports, `size` gives render hints, `audience` changes wording rules.
 */
export const DIAGRAM_SIZES = [
  "doc-inline",
  "slide-16x9",
  "social-og",
  "print-a4",
] as const;

export type DiagramSize = (typeof DIAGRAM_SIZES)[number];

export const DEFAULT_DIAGRAM_SIZE: DiagramSize = "doc-inline";

export interface DiagramSizePreset {
  label: string;
  /** Frame width in pixels; the height is fixed for slide/social targets. */
  width: number;
  height?: number;
  /** Label size in pixels — the slide preset is deliberately larger. */
  fontPx: number;
  /** Horizontal gap between siblings. */
  nodeSpacing: number;
  /** Vertical gap between levels. */
  rankSpacing: number;
  /** Inner padding of the canvas. */
  pad: number;
}

export const DIAGRAM_SIZE_PRESETS: Record<DiagramSize, DiagramSizePreset> = {
  "doc-inline": {
    label: "Doc inline — 960px wide, 12px labels",
    width: 960,
    fontPx: 12,
    nodeSpacing: 30,
    rankSpacing: 45,
    pad: 16,
  },
  "slide-16x9": {
    label: "Slide 16:9 — 1600×900, 16px labels",
    width: 1600,
    height: 900,
    fontPx: 16,
    nodeSpacing: 48,
    rankSpacing: 72,
    pad: 24,
  },
  "social-og": {
    label: "Social card — 1200×630, 14px labels",
    width: 1200,
    height: 630,
    fontPx: 14,
    nodeSpacing: 36,
    rankSpacing: 54,
    pad: 20,
  },
  "print-a4": {
    label: "Print A4 — 1240×1754 at 150 dpi, 14px labels",
    width: 1240,
    height: 1754,
    fontPx: 14,
    nodeSpacing: 32,
    rankSpacing: 48,
    pad: 24,
  },
};

export function isDiagramSize(value: string): value is DiagramSize {
  return (DIAGRAM_SIZES as readonly string[]).includes(value);
}

export function diagramSizePreset(size: DiagramSize): DiagramSizePreset {
  return DIAGRAM_SIZE_PRESETS[size];
}

export const DIAGRAM_DETAILS = ["faithful", "balanced", "simplified"] as const;

export type DiagramDetail = (typeof DIAGRAM_DETAILS)[number];

export const DEFAULT_DIAGRAM_DETAIL: DiagramDetail = "balanced";

/**
 * Degradation ladder: when a diagram is too big, things are dropped in this
 * order. The first step is the cheapest loss, the last one hurts most.
 */
export const DETAIL_DEGRADATION_LADDER = [
  "decor",
  "duplicates",
  "leaf clusters",
  "infrastructure",
] as const;

export type DetailLadderStep = (typeof DETAIL_DEGRADATION_LADDER)[number];

export const DIAGRAM_DETAIL_LIMITS: Record<DiagramDetail, DiagramBudget> = {
  faithful: { nodes: 24, edges: 36 },
  balanced: { nodes: 12, edges: 18 },
  simplified: { nodes: 7, edges: 10 },
};

export function isDiagramDetail(value: string): value is DiagramDetail {
  return (DIAGRAM_DETAILS as readonly string[]).includes(value);
}

export function diagramDetailBudget(detail: DiagramDetail): DiagramBudget {
  return { ...DIAGRAM_DETAIL_LIMITS[detail] };
}

export interface DiagramDetailReport {
  detail: DiagramDetail;
  limits: DiagramBudget;
  over: DiagramBudgetViolation[];
  /** Ordered next steps; empty when the diagram fits the ceiling. */
  ladder: DetailLadderStep[];
  warnings: string[];
}

function metricWord(metric: string): string {
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

/**
 * Detail is advisory on purpose: the plan says what would go, the diagram stays
 * untouched so the author decides. Counts come from the caller, not from a
 * rendered picture.
 */
export function checkDiagramDetail(
  detail: DiagramDetail,
  counts?: DiagramComplexityCounts,
): DiagramDetailReport {
  const limits = diagramDetailBudget(detail);
  const over: DiagramBudgetViolation[] = [];

  if (counts) {
    for (const key of Object.keys(limits) as Array<keyof DiagramBudget>) {
      const actual = counts[key];
      const limit = limits[key];
      if (limit === undefined || actual === undefined || !Number.isFinite(actual)) {
        continue;
      }
      if (actual > limit) {
        over.push({ metric: key, actual, limit });
      }
    }
  }

  const warnings = over.map(
    ({ metric, actual, limit }) =>
      `${actual} ${metricWord(metric)} with a ${detail} ceiling of ${limit} — drop in order: ${DETAIL_DEGRADATION_LADDER.join(" → ")}. Nothing was removed; counts are advisory.`,
  );

  return {
    detail,
    limits,
    over,
    ladder: over.length > 0 ? [...DETAIL_DEGRADATION_LADDER] : [],
    warnings,
  };
}

export const DIAGRAM_AUDIENCES = ["engineer", "mixed", "executive"] as const;

export type DiagramAudience = (typeof DIAGRAM_AUDIENCES)[number];

export const DEFAULT_DIAGRAM_AUDIENCE: DiagramAudience = "mixed";

export function isDiagramAudience(value: string): value is DiagramAudience {
  return (DIAGRAM_AUDIENCES as readonly string[]).includes(value);
}

/** Wording rules only — the number of boxes is set by `detail`, not here. */
export const AUDIENCE_LABEL_RULES: Record<DiagramAudience, string> = {
  engineer:
    "Technical names: component, endpoint, table, queue, retry. Keep codenames only when the team uses them daily.",
  mixed:
    "Plain nouns plus one clarifying word: \"Order service — checks payment\". No internal codenames, no abbreviations.",
  executive:
    "Name the outcome, not the mechanism: \"Checkout\", \"Payout\", \"Risk check\". Hide infrastructure unless it carries the argument.",
};

export function audienceRule(audience: DiagramAudience): string {
  return AUDIENCE_LABEL_RULES[audience];
}

export interface DiagramFidelityInput {
  format?: string;
  diagramType?: string;
  size: DiagramSize;
  detail: DiagramDetail;
  audience: DiagramAudience;
  counts?: DiagramComplexityCounts;
  /** False when the format cannot carry size hints; the ledger says so. */
  sizeApplied?: boolean;
}

/**
 * One-line receipt: what the caller asked for, what the plan knows about the
 * diagram, and what it did not do. Printed next to every generated source.
 */
export function diagramFidelity(input: DiagramFidelityInput): string {
  const preset = diagramSizePreset(input.size);
  const limits = diagramDetailBudget(input.detail);
  const parts: string[] = [];

  const head = [input.format, input.diagramType].filter(Boolean).join(" ");
  parts.push(head ? `fidelity: ${head}` : "fidelity");

  const counts = input.counts;
  const nodeCount = counts?.nodes;
  const edgeCount = counts?.edges;
  const countText =
    nodeCount === undefined && edgeCount === undefined
      ? "counts not supplied"
      : `${nodeCount ?? "?"} nodes, ${edgeCount ?? "?"} connections`;
  parts.push(countText);

  const report = checkDiagramDetail(input.detail, counts);
  if (report.over.length === 0) {
    parts.push(`detail ${input.detail} (≤${limits.nodes} nodes): within limits`);
  } else {
    const overText = report.over
      .map(({ metric, actual, limit }) => `${actual} ${metric} (≤${limit})`)
      .join(", ");
    parts.push(
      `detail ${input.detail} (≤${limits.nodes} nodes): over — ${overText}; next to drop: ${report.ladder.join(" → ")}`,
    );
  }

  parts.push(
    `size ${input.size} (${preset.width}px${preset.height ? `×${preset.height}px` : ""}, ${preset.fontPx}px labels)`,
  );
  if (input.sizeApplied === false) {
    parts.push("size hints not wired for this format");
  }

  parts.push(`audience ${input.audience}`);
  return parts.join(" · ");
}
