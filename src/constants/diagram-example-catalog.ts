import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { D2_SAMPLE_IDS } from "@/constants/d2-sample-diagrams";
import { GRAPHML_SAMPLE_IDS } from "@/constants/graphml-sample-diagrams";
import type { WizardDiagramType } from "@/constants/llm-wizard";
import {
  MERMAID_SAMPLE_IDS,
  MERMAID_SAMPLE_WIZARD_TYPES,
} from "@/constants/mermaid-sample-diagrams";
import {
  PLANTUML_SAMPLE_IDS,
  PLANTUML_SAMPLE_WIZARD_TYPES,
} from "@/constants/plantuml-sample-diagrams";
import { STRUCTURIZR_SAMPLE_IDS } from "@/constants/structurizr-sample-diagrams";
import { WIREMARK_SAMPLE_IDS } from "@/constants/wiremark-sample-diagrams";
import { wizardTagFontSizePx } from "@/constants/wizard-gallery";

export const EXAMPLE_TAG_AXES = [
  "language",
  "diagramType",
  "chartFamily",
  "domain",
  "setting",
] as const;

export type ExampleTagAxis = (typeof EXAMPLE_TAG_AXES)[number];

export const CHART_FAMILIES = ["structure", "behavior", "chart", "ui"] as const;

export type ChartFamily = (typeof CHART_FAMILIES)[number];

export const DOMAIN_IDS = [
  "architecture",
  "businessProcess",
  "project",
  "data",
  "software",
  "ux",
  "organization",
  "analytics",
  "product",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export const SETTING_IDS = [
  "break",
  "color",
  "mono",
  "labels",
  "thresholds",
  "direction-tb",
  "direction-lr",
  "swimlane",
  "noLines",
  "rotate90",
  "stacked",
  "monoInvert",
  "line",
  "cagr",
] as const;

export type SettingId = (typeof SETTING_IDS)[number];

export const EXTRA_DIAGRAM_TYPE_IDS = [
  "waterfall",
  "bubble",
  "heatmap",
  "orgchart",
  "ev",
  "boxplot",
  "treemap",
  "radar",
  "voronoi",
  "series",
  "decision",
] as const;

export type ExtraDiagramTypeId = (typeof EXTRA_DIAGRAM_TYPE_IDS)[number];

export type DiagramTypeTag = WizardDiagramType | ExtraDiagramTypeId;

export interface ExampleTagRef {
  axis: ExampleTagAxis;
  id: string;
}

export interface DiagramExample {
  id: string;
  format: DiagramFormat;
  sampleId: string;
  wizardType: WizardDiagramType;
  diagramType: DiagramTypeTag;
  tags: ExampleTagRef[];
}

export interface WizardCloudTag extends ExampleTagRef {
  count: number;
  fontSizePx: number;
}

const DOMAINS_BY_WIZARD_TYPE: Record<WizardDiagramType, readonly DomainId[]> = {
  sequence: ["architecture", "businessProcess"],
  class: ["software", "data"],
  component: ["architecture"],
  activity: ["businessProcess"],
  state: ["software", "businessProcess"],
  c4_context: ["architecture"],
  c4_container: ["architecture"],
  gantt: ["project", "analytics"],
  mindmap: ["product"],
  er: ["data"],
  graph: ["architecture", "data"],
  flowchart: ["businessProcess", "architecture"],
  pie: ["analytics"],
  journey: ["ux", "product"],
  gitgraph: ["software"],
  timeline: ["project", "product"],
  sankey: ["analytics", "businessProcess"],
  xychart: ["analytics"],
  block: ["architecture"],
  requirement: ["product"],
  quadrant: ["product", "analytics"],
  architecture: ["architecture"],
  packet: ["architecture", "software"],
  usecase: ["product", "businessProcess"],
  deployment: ["architecture"],
  object: ["software"],
  timing: ["software"],
  wbs: ["project"],
  nwdiag: ["architecture"],
  archimate: ["architecture", "businessProcess"],
  wireframe: ["ux"],
};

const CHART_FAMILY_BY_DIAGRAM_TYPE: Record<DiagramTypeTag, ChartFamily> = {
  sequence: "behavior",
  class: "structure",
  component: "structure",
  activity: "behavior",
  state: "behavior",
  c4_context: "structure",
  c4_container: "structure",
  gantt: "chart",
  mindmap: "structure",
  er: "structure",
  graph: "structure",
  flowchart: "behavior",
  pie: "chart",
  journey: "behavior",
  gitgraph: "behavior",
  timeline: "chart",
  sankey: "chart",
  xychart: "chart",
  block: "structure",
  requirement: "structure",
  quadrant: "chart",
  architecture: "structure",
  packet: "structure",
  usecase: "behavior",
  deployment: "structure",
  object: "structure",
  timing: "behavior",
  wbs: "structure",
  nwdiag: "structure",
  archimate: "structure",
  wireframe: "ui",
  waterfall: "chart",
  bubble: "chart",
  heatmap: "chart",
  orgchart: "structure",
  ev: "chart",
  boxplot: "chart",
  treemap: "chart",
  radar: "chart",
  voronoi: "chart",
  series: "chart",
  decision: "behavior",
};

const D2_WIZARD_TYPES = {
  flow: "flowchart",
  sequence: "sequence",
  classes: "class",
  sql: "er",
  architecture: "architecture",
} as const satisfies Record<(typeof D2_SAMPLE_IDS)[number], WizardDiagramType>;

const GRAPHML_WIZARD_TYPES = {
  flow: "graph",
  decision: "graph",
  architecture: "graph",
  states: "graph",
  network: "graph",
} as const satisfies Record<(typeof GRAPHML_SAMPLE_IDS)[number], WizardDiagramType>;

const STRUCTURIZR_WIZARD_TYPES = {
  context: "c4_context",
  containers: "c4_container",
  components: "component",
  deployment: "deployment",
} as const satisfies Record<(typeof STRUCTURIZR_SAMPLE_IDS)[number], WizardDiagramType>;

const DIAGRAM_TYPE_OVERRIDE: Record<string, DiagramTypeTag> = {
  "mermaid:waterfall": "waterfall",
  "mermaid:waterfallMono": "waterfall",
  "mermaid:waterfallBreak": "waterfall",
  "mermaid:waterfallMulti": "waterfall",
  "mermaid:waterfallLabels": "waterfall",
  "mermaid:waterfallNoLines": "waterfall",
  "mermaid:waterfallThresholds": "waterfall",
  "mermaid:bubble": "bubble",
  "mermaid:heatmap": "heatmap",
  "mermaid:orgchart": "orgchart",
  "mermaid:ev": "ev",
  "mermaid:boxplot": "boxplot",
  "mermaid:treemap": "treemap",
  "mermaid:radar": "radar",
  "mermaid:voronoi": "voronoi",
  "mermaid:clustered": "series",
  "mermaid:clusteredRotated": "series",
  "mermaid:clusteredStacked": "series",
  "mermaid:clusteredMono": "series",
  "mermaid:clusteredMonoInvert": "series",
  "mermaid:seriesLines": "series",
  "mermaid:seriesCagr": "series",
  "graphml:flow": "flowchart",
  "graphml:decision": "decision",
  "graphml:architecture": "architecture",
  "graphml:states": "state",
  "graphml:network": "nwdiag",
};

const DOMAIN_OVERRIDE: Record<string, readonly DomainId[]> = {
  "mermaid:waterfall": ["analytics"],
  "mermaid:waterfallMono": ["analytics"],
  "mermaid:waterfallBreak": ["analytics"],
  "mermaid:waterfallMulti": ["analytics"],
  "mermaid:waterfallLabels": ["analytics"],
  "mermaid:waterfallNoLines": ["analytics"],
  "mermaid:waterfallThresholds": ["analytics"],
  "mermaid:bubble": ["analytics"],
  "mermaid:heatmap": ["analytics"],
  "mermaid:orgchart": ["organization"],
  "mermaid:ev": ["analytics", "project"],
  "mermaid:boxplot": ["analytics", "data"],
  "mermaid:treemap": ["analytics", "product"],
  "mermaid:radar": ["analytics", "product"],
  "mermaid:voronoi": ["analytics", "data"],
  "mermaid:clustered": ["analytics"],
  "mermaid:clusteredRotated": ["analytics"],
  "mermaid:clusteredStacked": ["analytics"],
  "mermaid:clusteredMono": ["analytics"],
  "mermaid:clusteredMonoInvert": ["analytics"],
  "mermaid:seriesLines": ["analytics"],
  "mermaid:seriesCagr": ["analytics"],
  "graphml:flow": ["businessProcess", "architecture"],
  "graphml:decision": ["businessProcess"],
  "graphml:architecture": ["architecture"],
  "graphml:states": ["software", "businessProcess"],
  "graphml:network": ["architecture"],
};

const SETTINGS_BY_EXAMPLE: Record<string, readonly SettingId[]> = {
  "mermaid:waterfallBreak": ["break"],
  "mermaid:waterfallMono": ["mono"],
  "mermaid:waterfallLabels": ["labels"],
  "mermaid:waterfallThresholds": ["thresholds"],
  "mermaid:waterfallMulti": ["color"],
  "mermaid:waterfallNoLines": ["noLines"],
  "mermaid:boxplot": ["color"],
  "mermaid:treemap": ["color", "labels"],
  "mermaid:radar": ["color"],
  "mermaid:voronoi": ["color", "labels"],
  "mermaid:clustered": ["color", "labels"],
  "mermaid:clusteredRotated": ["rotate90", "color", "labels"],
  "mermaid:clusteredStacked": ["stacked", "color"],
  "mermaid:clusteredMono": ["mono"],
  "mermaid:clusteredMonoInvert": ["monoInvert"],
  "mermaid:seriesLines": ["line", "color", "labels"],
  "mermaid:seriesCagr": ["cagr", "labels"],
  "plantuml:activity": ["swimlane", "color"],
  "d2:flow": ["direction-lr", "color"],
  "d2:sequence": ["direction-tb"],
  "d2:classes": ["direction-tb"],
  "d2:sql": ["direction-lr"],
  "d2:architecture": ["direction-lr"],
};

interface SampleBinding {
  format: DiagramFormat;
  sampleId: string;
  wizardType: WizardDiagramType;
}

function exampleId(format: DiagramFormat, sampleId: string): string {
  return `${format}:${sampleId}`;
}

function sampleBindings(): SampleBinding[] {
  return [
    ...PLANTUML_SAMPLE_IDS.map((sampleId) => ({
      format: "plantuml" as const,
      sampleId,
      wizardType: PLANTUML_SAMPLE_WIZARD_TYPES[sampleId],
    })),
    ...MERMAID_SAMPLE_IDS.map((sampleId) => ({
      format: "mermaid" as const,
      sampleId,
      wizardType: MERMAID_SAMPLE_WIZARD_TYPES[sampleId],
    })),
    ...D2_SAMPLE_IDS.map((sampleId) => ({
      format: "d2" as const,
      sampleId,
      wizardType: D2_WIZARD_TYPES[sampleId],
    })),
    ...GRAPHML_SAMPLE_IDS.map((sampleId) => ({
      format: "graphml" as const,
      sampleId,
      wizardType: GRAPHML_WIZARD_TYPES[sampleId],
    })),
    ...STRUCTURIZR_SAMPLE_IDS.map((sampleId) => ({
      format: "structurizr" as const,
      sampleId,
      wizardType: STRUCTURIZR_WIZARD_TYPES[sampleId],
    })),
    ...WIREMARK_SAMPLE_IDS.map((sampleId) => ({
      format: "wiremark" as const,
      sampleId,
      wizardType: "wireframe" as const,
    })),
  ];
}

function buildExample(binding: SampleBinding): DiagramExample {
  const id = exampleId(binding.format, binding.sampleId);
  const diagramType = DIAGRAM_TYPE_OVERRIDE[id] ?? binding.wizardType;
  const domains = DOMAIN_OVERRIDE[id] ?? DOMAINS_BY_WIZARD_TYPE[binding.wizardType];
  const settings = SETTINGS_BY_EXAMPLE[id] ?? [];
  const family = CHART_FAMILY_BY_DIAGRAM_TYPE[diagramType];

  const tags: ExampleTagRef[] = [
    { axis: "language", id: binding.format },
    { axis: "diagramType", id: diagramType },
    { axis: "chartFamily", id: family },
    ...domains.map((domainId) => ({ axis: "domain" as const, id: domainId })),
    ...settings.map((settingId) => ({ axis: "setting" as const, id: settingId })),
  ];

  return {
    id,
    format: binding.format,
    sampleId: binding.sampleId,
    wizardType: binding.wizardType,
    diagramType,
    tags,
  };
}

export const DIAGRAM_EXAMPLES: readonly DiagramExample[] = sampleBindings().map(buildExample);

export function listDiagramExamples(): readonly DiagramExample[] {
  return DIAGRAM_EXAMPLES;
}

export function exampleTagKey(tag: ExampleTagRef): string {
  return `${tag.axis}:${tag.id}`;
}

export function exampleHasTag(example: DiagramExample, tag: ExampleTagRef): boolean {
  const key = exampleTagKey(tag);
  return example.tags.some((item) => exampleTagKey(item) === key);
}

export function exampleDomains(example: DiagramExample): string[] {
  return example.tags.filter((tag) => tag.axis === "domain").map((tag) => tag.id);
}

export function exampleDirection(
  example: DiagramExample,
): "TB" | "LR" {
  return example.tags.some(
    (tag) => tag.axis === "setting" && tag.id === "direction-lr",
  )
    ? "LR"
    : "TB";
}

export function filterDiagramExamples(
  examples: readonly DiagramExample[],
  selected: readonly ExampleTagRef[],
  query: string,
  textFor: (example: DiagramExample) => string,
): DiagramExample[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return examples.filter((example) => {
    const matchesTags = selected.every((tag) => exampleHasTag(example, tag));
    if (!matchesTags) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return textFor(example).toLocaleLowerCase().includes(normalizedQuery);
  });
}

export function listCloudTags(examples: readonly DiagramExample[]): WizardCloudTag[] {
  const counts = new Map<string, WizardCloudTag>();

  for (const example of examples) {
    for (const tag of example.tags) {
      const key = exampleTagKey(tag);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      counts.set(key, { ...tag, count: 1, fontSizePx: 0 });
    }
  }

  const tags = [...counts.values()];
  const countsOnly = tags.map((tag) => tag.count);
  const minCount = Math.min(...countsOnly);
  const maxCount = Math.max(...countsOnly);

  for (const tag of tags) {
    tag.fontSizePx = wizardTagFontSizePx(tag.count, minCount, maxCount);
  }

  return tags.sort((left, right) => {
    const axisOrder =
      EXAMPLE_TAG_AXES.indexOf(left.axis) - EXAMPLE_TAG_AXES.indexOf(right.axis);
    if (axisOrder !== 0) {
      return axisOrder;
    }

    return right.count - left.count || left.id.localeCompare(right.id);
  });
}
