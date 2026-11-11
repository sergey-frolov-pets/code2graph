import { wiremarkSampleCatalog } from "@/constants/wiremark-sample-diagrams";
import { wiremarkFormatHandler } from "@/formats/wiremark/handler";
import type { FormatHandler } from "@/formats/types";
import { withKeywordCompletions } from "@/languages/keyword-completion";
import { wiremarkLanguageKeywords } from "@/languages/keywords/wiremark";
import type { DiagramLanguageModule } from "@/languages/types";
import {
  isCompleteWiremarkDocument,
  looksLikeWiremarkSource,
} from "@/utils/wiremark-source";

let cachedHandler: FormatHandler | null = null;

export const wiremarkLanguageModule: DiagramLanguageModule = {
  id: "wiremark",
  definition: {
    id: "wiremark",
    language: "wiremark",
    extensions: [".wiremark"],
    mimeType: "text/vnd.wiremark",
    accept: ".wiremark",
    defaultFileName: "diagram.wiremark",
    editable: true,
    supportsSyntaxValidation: true,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: true,
    supportsSamples: true,
    supportsSaveSource: true,
    supportsOnlineRender: false,
    supportsStructuralConversion: true,
    requiresEngineBoot: false,
  },
  fileBadge: "WMK",
  labelKey: "editor.format.wiremark",
  titleTooltipKey: "editor.titleTooltip.wiremark",
  openFileKey: "editor.openWiremark",
  saveFileKey: "editor.saveWiremark",
  placeholderKey: "editor.placeholderWiremark",
  engineNotReadyKey: "app.engineNotReady",
  detectPriority: 10,
  isFallbackFormat: false,
  supportsSyntaxHighlight: true,
  supportsAutocomplete: true,
  keywords: wiremarkLanguageKeywords,
  samples: wiremarkSampleCatalog,
  get handler(): FormatHandler {
    cachedHandler ??= withKeywordCompletions(
      wiremarkFormatHandler,
      wiremarkLanguageKeywords,
    );
    return cachedHandler;
  },
  site: {
    purposeKey: "site.formats.wiremark.purpose",
    featuresKey: "site.formats.wiremark.features",
    summaryKey: "site.formats.wiremark.summary",
  },
  guide: {
    href: "https://docs.wiremark.dev/",
    labelKey: "settings.wiremarkGuide",
  },
  detectSource(source) {
    return looksLikeWiremarkSource(source);
  },
  isCompleteSource(source) {
    return isCompleteWiremarkDocument(source);
  },
};
