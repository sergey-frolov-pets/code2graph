import type { AppLocale } from "@/constants/i18n";
import {
  DIAGRAM_FORMATS,
  isDiagramFormat,
  type DiagramFormat,
} from "@/constants/diagram-format-ids";
import {
  getPlantUmlDefaultSource,
  isPlantUmlDefaultSource,
  PLANTUML_SAMPLE_IDS,
  type PlantUmlSampleId,
} from "@/constants/plantuml-sample-diagrams";
import type { MermaidSampleId } from "@/constants/mermaid-sample-diagrams";
import type { WiremarkSampleId } from "@/constants/wiremark-sample-diagrams";
import type { D2SampleId } from "@/constants/d2-sample-diagrams";
import type { StructurizrSampleId } from "@/constants/structurizr-sample-diagrams";
import {
  getDiagramFormatDefinition,
  getLanguageModule,
} from "@/languages/registry";
import type { SampleCatalog } from "@/languages/sample-catalog";

export { PLANTUML_SAMPLE_IDS, type PlantUmlSampleId };
export type { MermaidSampleId };
export { MERMAID_SAMPLE_IDS } from "@/constants/mermaid-sample-diagrams";
export type { WiremarkSampleId };
export { WIREMARK_SAMPLE_IDS } from "@/constants/wiremark-sample-diagrams";
export type { D2SampleId };
export { D2_SAMPLE_IDS } from "@/constants/d2-sample-diagrams";
export type { StructurizrSampleId };
export { STRUCTURIZR_SAMPLE_IDS } from "@/constants/structurizr-sample-diagrams";

export interface SampleSelection {
  format: DiagramFormat;
  id: string;
}

export function getSampleCatalog(format: DiagramFormat): SampleCatalog | null {
  const catalog = getLanguageModule(format).samples;
  if (!catalog || !getLanguageModule(format).definition.supportsSamples) {
    return null;
  }

  return catalog;
}

export function listSampleIds(format: DiagramFormat): readonly string[] {
  return getSampleCatalog(format)?.ids ?? [];
}

export function getDefaultSource(locale: AppLocale): string {
  return getPlantUmlDefaultSource(locale);
}

export function getSampleSource(
  selection: SampleSelection,
  locale: AppLocale,
): string {
  const catalog = getSampleCatalog(selection.format);
  if (!catalog || !(catalog.ids as readonly string[]).includes(selection.id)) {
    throw new Error(`Unknown sample ${selection.format}:${selection.id}`);
  }

  return catalog.getSource(selection.id, locale);
}

export function isDefaultSource(source: string): boolean {
  return isPlantUmlDefaultSource(source);
}

export function isSampleDiagramSource(source: string): boolean {
  return Object.values(getRegisteredCatalogs()).some((catalog) =>
    catalog.isSampleSource(source),
  );
}

function getRegisteredCatalogs(): SampleCatalog[] {
  return DIAGRAM_FORMATS.map((format) => getSampleCatalog(format)).filter(
    (catalog): catalog is SampleCatalog => catalog !== null,
  );
}

function listRegisteredFormats(): readonly DiagramFormat[] {
  return DIAGRAM_FORMATS;
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

  for (const format of listRegisteredFormats()) {
    const catalog = getSampleCatalog(format);
    const sampleId = catalog?.findId(source, fromLocale);
    if (catalog && sampleId) {
      return catalog.getSource(sampleId, toLocale);
    }
  }

  return null;
}

export function findAnySampleSelection(
  source: string,
  locale: AppLocale,
): SampleSelection | null {
  for (const format of listRegisteredFormats()) {
    const catalog = getSampleCatalog(format);
    const sampleId = catalog?.findId(source, locale);
    if (sampleId) {
      return { format, id: sampleId };
    }
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
  const extension = getDiagramFormatDefinition(selection.format).extensions[0];
  return `${label}${extension}`;
}

export function parseSampleSelection(value: string): SampleSelection | null {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  const format = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);
  if (!isDiagramFormat(format)) {
    return null;
  }

  const catalog = getSampleCatalog(format);
  if (!catalog || !(catalog.ids as readonly string[]).includes(id)) {
    return null;
  }

  return { format, id };
}
