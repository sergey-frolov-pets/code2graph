import type { AppLocale } from "@/constants/i18n";
import { getPlantUmlRichSample } from "@/constants/plantuml-rich-samples";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import type { SampleCatalog } from "@/languages/sample-catalog";

export const PLANTUML_SAMPLE_IDS = [
  "classes",
  "sequence",
  "components",
  "state",
  "activity",
  "c4_context",
  "c4",
  "er",
  "usecase",
  "deployment",
  "object",
  "timing",
  "gantt",
  "mindmap",
  "wbs",
  "nwdiag",
  "archimate",
] as const;

export type PlantUmlSampleId = (typeof PLANTUML_SAMPLE_IDS)[number];

export const HANDCRAFTED_PLANTUML_SAMPLE_IDS = [
  "classes",
  "sequence",
  "components",
  "state",
  "activity",
  "c4",
  "gantt",
  "mindmap",
] as const satisfies readonly PlantUmlSampleId[];

export type HandcraftedPlantUmlSampleId = (typeof HANDCRAFTED_PLANTUML_SAMPLE_IDS)[number];

export const PLANTUML_SAMPLE_WIZARD_TYPES: Record<PlantUmlSampleId, import("@/constants/llm-wizard").WizardDiagramType> = {
  classes: "class",
  sequence: "sequence",
  components: "component",
  state: "state",
  activity: "activity",
  c4_context: "c4_context",
  c4: "c4_container",
  er: "er",
  usecase: "usecase",
  deployment: "deployment",
  object: "object",
  timing: "timing",
  gantt: "gantt",
  mindmap: "mindmap",
  wbs: "wbs",
  nwdiag: "nwdiag",
  archimate: "archimate",
};

import {
  DEFAULT_SOURCE_EN,
  DEFAULT_SOURCE_RU,
  SAMPLE_DIAGRAMS_RU,
} from "@/constants/samples/plantuml-handcrafted-samples-ru";
import { SAMPLE_DIAGRAMS_EN } from "@/constants/samples/plantuml-handcrafted-samples-en";

const SOURCES_BY_LOCALE: Record<AppLocale, Record<HandcraftedPlantUmlSampleId, string>> = {
  ru: SAMPLE_DIAGRAMS_RU,
  en: SAMPLE_DIAGRAMS_EN,
};

function isHandcraftedPlantUmlSampleId(
  id: PlantUmlSampleId,
): id is HandcraftedPlantUmlSampleId {
  return (HANDCRAFTED_PLANTUML_SAMPLE_IDS as readonly string[]).includes(id);
}

function buildPlantUmlSampleSource(id: PlantUmlSampleId, locale: AppLocale): string {
  if (isHandcraftedPlantUmlSampleId(id)) {
    return SOURCES_BY_LOCALE[locale][id];
  }

  return (
    getPlantUmlRichSample(id, locale) ??
    buildWizardDiagramSample(
      PLANTUML_SAMPLE_WIZARD_TYPES[id],
      "plantuml",
      locale,
    )
  );
}

const DEFAULT_SOURCE_BY_LOCALE: Record<AppLocale, string> = {
  ru: DEFAULT_SOURCE_RU,
  en: DEFAULT_SOURCE_EN,
};

export function getPlantUmlDefaultSource(locale: AppLocale): string {
  return DEFAULT_SOURCE_BY_LOCALE[locale];
}

export function getPlantUmlSampleSource(
  id: PlantUmlSampleId,
  locale: AppLocale,
): string {
  return buildPlantUmlSampleSource(id, locale);
}

export function findPlantUmlSampleId(
  source: string,
  locale: AppLocale,
): PlantUmlSampleId | null {
  for (const id of PLANTUML_SAMPLE_IDS) {
    if (buildPlantUmlSampleSource(id, locale) === source) {
      return id;
    }
  }

  return null;
}

export function isPlantUmlDefaultSource(source: string): boolean {
  return source === DEFAULT_SOURCE_RU || source === DEFAULT_SOURCE_EN;
}

const ALL_PLANTUML_SAMPLE_SOURCES = new Set<string>();

export function getAllPlantUmlSampleSources(): string[] {
  const sources = new Set<string>([DEFAULT_SOURCE_RU, DEFAULT_SOURCE_EN]);

  for (const locale of ["ru", "en"] as AppLocale[]) {
    for (const id of PLANTUML_SAMPLE_IDS) {
      sources.add(buildPlantUmlSampleSource(id, locale));
    }
  }

  return [...sources];
}

for (const source of getAllPlantUmlSampleSources()) {
  ALL_PLANTUML_SAMPLE_SOURCES.add(source);
}

export const plantUmlSampleCatalog: SampleCatalog = {
  ids: PLANTUML_SAMPLE_IDS,
  getSource(id, locale) {
    return getPlantUmlSampleSource(id as PlantUmlSampleId, locale);
  },
  findId(source, locale) {
    return findPlantUmlSampleId(source, locale);
  },
  isSampleSource(source) {
    return ALL_PLANTUML_SAMPLE_SOURCES.has(source);
  },
};
