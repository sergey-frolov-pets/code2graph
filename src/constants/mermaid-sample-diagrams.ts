import { SUPPORTED_LOCALES, type AppLocale } from "@/constants/i18n";
import { getMermaidRichSample } from "@/constants/mermaid-rich-samples";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import type { SampleCatalog } from "@/languages/sample-catalog";

/**
 * Первая строка примера расширения: штатный Mermaid этот синтаксис не рисует.
 */
export const MERMAID_EXT_SAMPLE_NOTICE: Record<AppLocale, string> = {
  en: "%% This is a Mermaid extension and is not supported by standard Mermaid.",
  ru: "%% Это расширение Mermaid и не поддерживается стандартным Mermaid.",
  es: "%% Esta es una extensión de Mermaid y el Mermaid estándar no la admite.",
  zh: "%% 这是 Mermaid 扩展，标准 Mermaid 不支持该语法。",
  ja: "%% これは Mermaid 拡張であり、標準の Mermaid ではサポートされません。",
  hi: "%% यह Mermaid एक्सटेंशन है और मानक Mermaid इसे समर्थन नहीं करता।",
  pt: "%% Esta é uma extensão do Mermaid e o Mermaid padrão não a suporta.",
  de: "%% Dies ist eine Mermaid-Erweiterung und wird von Standard-Mermaid nicht unterstützt.",
  ar: "%% هذا امتداد Mermaid ولا يدعمه Mermaid القياسي.",
};

export const MERMAID_SAMPLE_IDS = [
  "flowchart",
  "sequence",
  "classDiagram",
  "component",
  "activity",
  "state",
  "er",
  "gantt",
  "mindmap",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "c4_context",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
  // Расширение Mermaid Ext (src/services/mermaid/ext). Типы рисует встроенный
  // движок при __MERMAID_EXT__ = true (по умолчанию в проде). Сэмплы помечены
  // как ext-типы и на странице языка идут отдельной группой.
  "waterfall",
  "waterfallMono",
  "waterfallBreak",
  "waterfallMulti",
  "waterfallLabels",
  "waterfallNoLines",
  "waterfallThresholds",
  "bubble",
  "heatmap",
  "orgchart",
  "ev",
  "boxplot",
  "treemap",
  "radar",
  "voronoi",
  "clustered",
  "clusteredRotated",
  "clusteredStacked",
  "seriesArea",
  "clusteredMono",
  "clusteredMonoInvert",
  "seriesLines",
  "seriesCagr",
  "seriesCagrRanges",
  "seriesBreak",
  "seriesThresholds",
  "seriesUnnamed",
  "histogram",
  "histogramBins",
  "histogramCurves",
  "histogramLabels",
  "histogramClean",
  "histogramDensity",
  "histogramMono",
  "histogramRotate",
  "histogramLine",
] as const;

export type MermaidSampleId = (typeof MERMAID_SAMPLE_IDS)[number];

/**
 * Типы, которые рисует расширение Mermaid Ext, а не штатный Mermaid.
 * Источник истины по синтаксису — docs/mermaid-ext-syntax.md.
 */
export const MERMAID_EXT_SAMPLE_IDS = [
  "waterfall",
  "waterfallMono",
  "waterfallBreak",
  "waterfallMulti",
  "waterfallLabels",
  "waterfallNoLines",
  "waterfallThresholds",
  "bubble",
  "heatmap",
  "orgchart",
  "ev",
  "boxplot",
  "treemap",
  "radar",
  "voronoi",
  "clustered",
  "clusteredRotated",
  "clusteredStacked",
  "seriesArea",
  "clusteredMono",
  "clusteredMonoInvert",
  "seriesLines",
  "seriesCagr",
  "seriesCagrRanges",
  "seriesBreak",
  "seriesThresholds",
  "seriesUnnamed",
  "histogram",
  "histogramBins",
  "histogramCurves",
  "histogramLabels",
  "histogramClean",
  "histogramDensity",
  "histogramMono",
  "histogramRotate",
  "histogramLine",
] as const satisfies readonly MermaidSampleId[];

export type MermaidExtSampleId = (typeof MERMAID_EXT_SAMPLE_IDS)[number];

export function isMermaidExtSampleId(id: string): id is MermaidExtSampleId {
  return (MERMAID_EXT_SAMPLE_IDS as readonly string[]).includes(id);
}

export const HANDCRAFTED_MERMAID_SAMPLE_IDS = [
  "flowchart",
  "sequence",
  "classDiagram",
  "state",
  "er",
  "gantt",
] as const satisfies readonly MermaidSampleId[];

export type HandcraftedMermaidSampleId = (typeof HANDCRAFTED_MERMAID_SAMPLE_IDS)[number];

export const MERMAID_SAMPLE_WIZARD_TYPES: Record<MermaidSampleId, import("@/constants/llm-wizard").WizardDiagramType> = {
  flowchart: "flowchart",
  sequence: "sequence",
  classDiagram: "class",
  component: "component",
  activity: "activity",
  state: "state",
  er: "er",
  gantt: "gantt",
  mindmap: "mindmap",
  pie: "pie",
  journey: "journey",
  gitgraph: "gitgraph",
  timeline: "timeline",
  sankey: "sankey",
  xychart: "xychart",
  block: "block",
  c4_context: "c4_context",
  requirement: "requirement",
  quadrant: "quadrant",
  architecture: "architecture",
  packet: "packet",
  // Mermaid Ext: у этих типов нет собственного шаблона мастера,
  // ближайший по смыслу — flowchart (дерево/шаги).
  waterfall: "flowchart",
  waterfallMono: "flowchart",
  waterfallBreak: "flowchart",
  waterfallMulti: "flowchart",
  waterfallLabels: "flowchart",
  waterfallNoLines: "flowchart",
  waterfallThresholds: "flowchart",
  bubble: "flowchart",
  heatmap: "flowchart",
  orgchart: "flowchart",
  ev: "flowchart",
  boxplot: "xychart",
  treemap: "pie",
  radar: "xychart",
  voronoi: "quadrant",
  clustered: "xychart",
  clusteredRotated: "xychart",
  clusteredStacked: "xychart",
  seriesArea: "xychart",
  clusteredMono: "xychart",
  clusteredMonoInvert: "xychart",
  seriesLines: "xychart",
  seriesCagr: "xychart",
  seriesCagrRanges: "xychart",
  seriesBreak: "xychart",
  seriesThresholds: "xychart",
  seriesUnnamed: "xychart",
  histogram: "xychart",
  histogramBins: "xychart",
  histogramCurves: "xychart",
  histogramLabels: "xychart",
  histogramClean: "xychart",
  histogramDensity: "xychart",
  histogramMono: "xychart",
  histogramRotate: "xychart",
  histogramLine: "xychart",
};

import {
  MERMAID_SAMPLES_EN,
  MERMAID_SAMPLES_RU,
} from "@/constants/samples/mermaid-handcrafted-samples";
import { MERMAID_HANDCRAFTED_EXTRA } from "@/constants/samples/localized/mermaid-handcrafted";
import {
  MERMAID_EXT_SAMPLES_EN,
  MERMAID_EXT_SAMPLES_RU,
} from "@/constants/samples/mermaid-ext-samples";
import { MERMAID_EXT_EXTRA } from "@/constants/samples/localized/mermaid-ext";

const MERMAID_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<HandcraftedMermaidSampleId, string>
> = {
  ru: MERMAID_SAMPLES_RU,
  en: MERMAID_SAMPLES_EN,
  ...MERMAID_HANDCRAFTED_EXTRA,
};

const MERMAID_EXT_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<MermaidExtSampleId, string>
> = {
  ru: MERMAID_EXT_SAMPLES_RU,
  en: MERMAID_EXT_SAMPLES_EN,
  ...MERMAID_EXT_EXTRA,
};

function isHandcraftedMermaidSampleId(
  id: MermaidSampleId,
): id is HandcraftedMermaidSampleId {
  return (HANDCRAFTED_MERMAID_SAMPLE_IDS as readonly string[]).includes(id);
}

function withMermaidExtNotice(source: string, locale: AppLocale): string {
  const notice = MERMAID_EXT_SAMPLE_NOTICE[locale];
  if (source.startsWith(`${notice}\n`) || source === notice) {
    return source;
  }

  return `${notice}\n${source}`;
}

function buildMermaidSampleSource(id: MermaidSampleId, locale: AppLocale): string {
  if (isMermaidExtSampleId(id)) {
    return withMermaidExtNotice(MERMAID_EXT_SOURCES_BY_LOCALE[locale][id], locale);
  }

  if (isHandcraftedMermaidSampleId(id)) {
    return MERMAID_SOURCES_BY_LOCALE[locale][id];
  }

  return (
    getMermaidRichSample(id, locale) ??
    buildWizardDiagramSample(
      MERMAID_SAMPLE_WIZARD_TYPES[id],
      "mermaid",
      locale,
    )
  );
}

const ALL_MERMAID_SAMPLE_SOURCES = new Set<string>();
for (const locale of SUPPORTED_LOCALES) {
  for (const id of MERMAID_SAMPLE_IDS) {
    ALL_MERMAID_SAMPLE_SOURCES.add(buildMermaidSampleSource(id, locale));
  }
}

export function getMermaidSampleSource(
  id: MermaidSampleId,
  locale: AppLocale,
): string {
  return buildMermaidSampleSource(id, locale);
}

export function findMermaidSampleId(
  source: string,
  locale: AppLocale,
): MermaidSampleId | null {
  for (const id of MERMAID_SAMPLE_IDS) {
    if (buildMermaidSampleSource(id, locale) === source) {
      return id;
    }
  }

  return null;
}

export function findMermaidSampleIdAnyLocale(
  source: string,
): MermaidSampleId | null {
  for (const locale of Object.keys(MERMAID_SOURCES_BY_LOCALE) as AppLocale[]) {
    const id = findMermaidSampleId(source, locale);
    if (id) {
      return id;
    }
  }
  return null;
}

export function isMermaidSampleSource(source: string): boolean {
  return ALL_MERMAID_SAMPLE_SOURCES.has(source);
}

export const mermaidSampleCatalog: SampleCatalog = {
  ids: MERMAID_SAMPLE_IDS,
  getSource(id, locale) {
    return getMermaidSampleSource(id as MermaidSampleId, locale);
  },
  findId(source, locale) {
    return findMermaidSampleId(source, locale);
  },
  isSampleSource(source) {
    return isMermaidSampleSource(source);
  },
};

export function translateMermaidSourceForLocale(
  source: string,
  fromLocale: AppLocale,
  toLocale: AppLocale,
): string | null {
  if (fromLocale === toLocale) {
    return source;
  }

  const sampleId = findMermaidSampleId(source, fromLocale);
  if (sampleId) {
    return getMermaidSampleSource(sampleId, toLocale);
  }

  return null;
}
