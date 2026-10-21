import type { DiagramLanguage } from "@/constants/diagram-library";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { LocaleKey } from "@/locales/types";
import type { FormatHandler } from "@/formats/types";
import type { SampleCatalog } from "@/languages/sample-catalog";

export interface DiagramFormatDefinition {
  id: DiagramFormat;
  language: DiagramLanguage;
  extensions: readonly string[];
  mimeType: string;
  accept: string;
  defaultFileName: string;
  editable: boolean;
  supportsSyntaxValidation: boolean;
  supportsAiPatch: boolean;
  supportsAiSyntaxAsk: boolean;
  supportsSnippets: boolean;
  supportsSamples: boolean;
  supportsSaveSource: boolean;
  supportsOnlineRender: boolean;
  /** When false, conversion leaves an empty model instead of a structural parse. */
  supportsStructuralConversion: boolean;
  /** Async engine boot (PlantUML, Mermaid, D2) before the first render. */
  requiresEngineBoot: boolean;
}

export interface DiagramLanguageSiteCopy {
  purposeKey: LocaleKey;
  featuresKey: LocaleKey;
}

export interface DiagramLanguageGuide {
  href: string;
  labelKey: LocaleKey;
}

/**
 * Everything a new diagram language needs besides locale strings.
 * Register the object in `src/languages/registry.ts`.
 */
export interface DiagramLanguageModule {
  id: DiagramFormat;
  definition: DiagramFormatDefinition;
  fileBadge: string;
  labelKey: LocaleKey;
  titleTooltipKey: LocaleKey;
  openFileKey: LocaleKey;
  saveFileKey: LocaleKey;
  placeholderKey: LocaleKey;
  engineNotReadyKey: LocaleKey;
  /** Higher values win when several detectors match the same source. */
  detectPriority: number;
  /** PlantUML stays the fallback when a file name has no stronger marker. */
  isFallbackFormat: boolean;
  supportsSyntaxHighlight: boolean;
  supportsAutocomplete: boolean;
  onlineProbe?: "plantuml" | "mermaid";
  samples: SampleCatalog | null;
  handler: FormatHandler;
  site?: DiagramLanguageSiteCopy;
  guide?: DiagramLanguageGuide;
  detectSource(source: string): boolean;
  isCompleteSource(source: string): boolean;
}
