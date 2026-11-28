import type { AgentDiagramType } from "./agent-diagram.js";

/**
 * Semantic patterns: a described behaviour maps to a diagram type that fits it.
 * The planner returns the pattern id so an agent stops drawing "boxes with arrows"
 * where a state machine, a table model, or a message sequence is the honest shape.
 */
export interface DiagramPattern {
  id: string;
  label: string;
  type: AgentDiagramType;
  /** Every cue must match for the pattern to apply. */
  all?: RegExp[];
  /** At least one cue must match for the pattern to apply. */
  any: RegExp[];
  reason: string;
}

export interface DiagramPatternMatch {
  pattern: string;
  label: string;
  type: AgentDiagramType;
  reason: string;
}

export const DIAGRAM_PATTERNS: readonly DiagramPattern[] = [
  {
    id: "paired-policy-traces",
    label: "Paired policy traces",
    type: "sequence",
    all: [/политик|policy/i],
    any: [/разреш|запрет|allow|deny|отказ|запрещающ/i],
    reason:
      "A policy is shown as paired traces (allowed / denied), not as one generic flow.",
  },
  {
    id: "fan-in-queue",
    label: "Fan-in through a queue",
    type: "sequence",
    any: [
      /очеред|queue/i,
      /брокер|broker|kafka|rabbit|nats|sqs/i,
      /продюсер|producer|консьюмер|consumer|подписчик|subscriber/i,
      /fan-?in|веер/i,
    ],
    reason:
      "Messages through a queue read as producer → broker → consumers; keep it ≤5 lifelines or split.",
  },
  {
    id: "lifecycle-phase",
    label: "Lifecycle / phase map",
    type: "state",
    any: [
      /жизненн\w*\s+цикл|lifecycle/i,
      /статус|status|состояни\w*\s+заявк|state machine|автомат/i,
      /переход\w*\s+(между|из)|transitions?\s+(between|from)/i,
      /phrase|фазы|этапы обработки заявк/i,
    ],
    reason:
      "Statuses and transitions are a state machine; phases with gates read as a state diagram too.",
  },
  {
    id: "secure-paved-road",
    label: "Secure paved road",
    type: "component",
    any: [
      /paved\s*road|проторенн|эталонн\w*\s+путь|золот\w*\s+путь/i,
      /secure\s+by\s+default|безопасн\w*\s+по\s+умолчанию/i,
      /шаблон\s+сервиса|service\s+template|golden\s+path/i,
    ],
    reason:
      "A paved road is a handful of components with mandatory steps (CI, scanners, deploy), not a process flowchart.",
  },
  {
    id: "governance-catalog",
    label: "Governance catalog",
    type: "er",
    all: [/реестр|каталог|catalog|registry|инвентар/i],
    any: [
      /владел|owner|ответственн|accountab/i,
      /аттестац|audit|проверк|compliance|соответстви/i,
      /политик|policy|sla|срок/i,
    ],
    reason:
      "A registry of owners and obligations is a table model (entities + relationships), not arrows.",
  },
];

export function detectDiagramPattern(request: string): DiagramPatternMatch | null {
  const text = request.trim();
  if (!text) {
    return null;
  }

  for (const pattern of DIAGRAM_PATTERNS) {
    const allMatch = (pattern.all ?? []).every((cue) => cue.test(text));
    if (!allMatch) {
      continue;
    }
    if (!pattern.any.some((cue) => cue.test(text))) {
      continue;
    }
    return {
      pattern: pattern.id,
      label: pattern.label,
      type: pattern.type,
      reason: pattern.reason,
    };
  }

  return null;
}

export function isDiagramPatternId(value: string): boolean {
  return DIAGRAM_PATTERNS.some((pattern) => pattern.id === value);
}

export function getDiagramPattern(id: string): DiagramPatternMatch | null {
  const pattern = DIAGRAM_PATTERNS.find((item) => item.id === id);
  if (!pattern) {
    return null;
  }
  return {
    pattern: pattern.id,
    label: pattern.label,
    type: pattern.type,
    reason: pattern.reason,
  };
}

export function listDiagramPatterns(): {
  pattern: string;
  label: string;
  type: AgentDiagramType;
}[] {
  return DIAGRAM_PATTERNS.map((pattern) => ({
    pattern: pattern.id,
    label: pattern.label,
    type: pattern.type,
  }));
}
