import { structurizrSampleCatalog } from "@/constants/structurizr-sample-diagrams";
import { structurizrFormatHandler } from "@/formats/structurizr/handler";
import type { DiagramLanguageModule } from "@/languages/types";
import { looksLikeStructurizrSource } from "@shared/structurizr-source";

export const structurizrLanguageModule: DiagramLanguageModule = {
  id: "structurizr",
  definition: {
    id: "structurizr",
    language: "structurizr",
    extensions: [".dsl", ".structurizr"],
    mimeType: "text/vnd.structurizr.dsl",
    accept: ".dsl,.structurizr",
    defaultFileName: "diagram.dsl",
    editable: true,
    supportsSyntaxValidation: true,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: false,
    supportsSamples: true,
    supportsSaveSource: true,
    supportsOnlineRender: false,
    supportsStructuralConversion: false,
    requiresEngineBoot: true,
  },
  fileBadge: "DSL",
  labelKey: "editor.format.structurizr",
  titleTooltipKey: "editor.titleTooltip.structurizr",
  openFileKey: "editor.openStructurizr",
  saveFileKey: "editor.saveStructurizr",
  placeholderKey: "editor.placeholderStructurizr",
  engineNotReadyKey: "app.structurizrEngineNotReady",
  detectPriority: 25,
  isFallbackFormat: false,
  supportsSyntaxHighlight: true,
  supportsAutocomplete: false,
  samples: structurizrSampleCatalog,
  get handler() {
    return structurizrFormatHandler;
  },
  site: {
    purposeKey: "site.formats.structurizr.purpose",
    featuresKey: "site.formats.structurizr.features",
  },
  guide: {
    href: "https://docs.structurizr.com/dsl/language",
    labelKey: "settings.structurizrGuide",
  },
  detectSource(source) {
    return looksLikeStructurizrSource(source);
  },
  isCompleteSource(source) {
    return looksLikeStructurizrSource(source);
  },
};
