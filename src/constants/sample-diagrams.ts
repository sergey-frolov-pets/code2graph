import type { AppLocale } from "@/constants/i18n";
import {
  findMermaidSampleId,
  getMermaidSampleSource,
  isMermaidSampleSource,
  type MermaidSampleId,
} from "@/constants/mermaid-sample-diagrams";
import {
  findPlantUmlSampleId,
  getAllPlantUmlSampleSources,
  getPlantUmlDefaultSource,
  getPlantUmlSampleSource,
  isPlantUmlDefaultSource,
  PLANTUML_SAMPLE_IDS,
  type PlantUmlSampleId,
} from "@/constants/plantuml-sample-diagrams";

export { PLANTUML_SAMPLE_IDS, type PlantUmlSampleId };
export type { MermaidSampleId };
export { MERMAID_SAMPLE_IDS } from "@/constants/mermaid-sample-diagrams";

export type SampleSelection =
  | { format: "plantuml"; id: PlantUmlSampleId }
  | { format: "mermaid"; id: MermaidSampleId };

const ALL_SAMPLE_SOURCES = new Set([
  ...getAllPlantUmlSampleSources(),
]);

export function getDefaultSource(locale: AppLocale): string {
  return getPlantUmlDefaultSource(locale);
}

export function getSampleSource(
  selection: SampleSelection,
  locale: AppLocale,
): string {
  if (selection.format === "mermaid") {
    return getMermaidSampleSource(selection.id, locale);
  }

  return getPlantUmlSampleSource(selection.id, locale);
}

export function isDefaultSource(source: string): boolean {
  return isPlantUmlDefaultSource(source);
}

export function isSampleDiagramSource(source: string): boolean {
  return ALL_SAMPLE_SOURCES.has(source) || isMermaidSampleSource(source);
}

export function translateSourceForLocale(
  source: string,
  fromLocale: AppLocale,
  toLocale: AppLocale,
): string | null {
  if (fromLocale === toLocale) {
    return source;
  }

  if (isDefaultSource(source)) {
    return getDefaultSource(toLocale);
  }

  const sampleId = findPlantUmlSampleId(source, fromLocale);
  if (sampleId) {
    return getPlantUmlSampleSource(sampleId, toLocale);
  }

  const mermaidSampleId = findMermaidSampleId(source, fromLocale);
  if (mermaidSampleId) {
    return getMermaidSampleSource(mermaidSampleId, toLocale);
  }

  return null;
}

export function findAnySampleSelection(
  source: string,
  locale: AppLocale,
): SampleSelection | null {
  const plantUmlId = findPlantUmlSampleId(source, locale);
  if (plantUmlId) {
    return { format: "plantuml", id: plantUmlId };
  }

  const mermaidId = findMermaidSampleId(source, locale);
  if (mermaidId) {
    return { format: "mermaid", id: mermaidId };
  }

  return null;
}

export function findAnySampleSelectionAnyLocale(
  source: string,
): SampleSelection | null {
  for (const locale of ["ru", "en"] as AppLocale[]) {
    const selection = findAnySampleSelection(source, locale);
    if (selection) {
      return selection;
    }
  }
  return null;
}

export function getDefaultFileNameForSample(
  selection: SampleSelection,
  label: string,
): string {
  if (selection.format === "mermaid") {
    return `${label}.mmd`;
  }
  return `${label}.puml`;
}
