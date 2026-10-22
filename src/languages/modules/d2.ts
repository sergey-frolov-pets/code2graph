import { d2SampleCatalog } from "@/constants/d2-sample-diagrams";
import { d2FormatHandler } from "@/formats/d2/handler";
import type { DiagramLanguageModule } from "@/languages/types";
import { looksLikeD2Source } from "@shared/d2-source";

export const d2LanguageModule: DiagramLanguageModule = {
  id: "d2",
  definition: {
    id: "d2",
    language: "d2",
    extensions: [".d2"],
    mimeType: "text/vnd.d2",
    accept: ".d2",
    defaultFileName: "diagram.d2",
    editable: true,
    supportsSyntaxValidation: true,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: false,
    supportsSamples: true,
    supportsSaveSource: true,
    supportsOnlineRender: false,
    supportsStructuralConversion: true,
    requiresEngineBoot: true,
  },
  fileBadge: "D2",
  labelKey: "editor.format.d2",
  titleTooltipKey: "editor.titleTooltip.d2",
  openFileKey: "editor.openD2",
  saveFileKey: "editor.saveD2",
  placeholderKey: "editor.placeholderD2",
  engineNotReadyKey: "app.d2EngineNotReady",
  detectPriority: 20,
  isFallbackFormat: false,
  supportsSyntaxHighlight: true,
  supportsAutocomplete: false,
  samples: d2SampleCatalog,
  get handler() {
    return d2FormatHandler;
  },
  site: {
    purposeKey: "site.formats.d2.purpose",
    featuresKey: "site.formats.d2.features",
    summaryKey: "site.formats.d2.summary",
  },
  guide: {
    href: "https://d2lang.com/tour/intro/",
    labelKey: "settings.d2Guide",
  },
  detectSource(source) {
    return looksLikeD2Source(source);
  },
  isCompleteSource(source) {
    return looksLikeD2Source(source);
  },
};
