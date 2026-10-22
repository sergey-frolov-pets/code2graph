import { graphmlSampleCatalog } from "@/constants/graphml-sample-diagrams";
import { graphmlFormatHandler } from "@/formats/graphml/handler";
import type { DiagramLanguageModule } from "@/languages/types";
import { isCompleteGraphmlDocument } from "@/utils/graphml-source";

export const graphmlLanguageModule: DiagramLanguageModule = {
  id: "graphml",
  definition: {
    id: "graphml",
    language: "graphml",
    extensions: [".graphml"],
    mimeType: "application/graphml+xml",
    accept: ".graphml",
    defaultFileName: "diagram.graphml",
    editable: true,
    supportsSyntaxValidation: true,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: false,
    supportsSamples: true,
    supportsSaveSource: true,
    supportsOnlineRender: false,
    supportsStructuralConversion: true,
    requiresEngineBoot: false,
  },
  fileBadge: "GML",
  labelKey: "editor.format.graphml",
  titleTooltipKey: "editor.titleTooltip.graphml",
  openFileKey: "editor.openGraphml",
  saveFileKey: "editor.saveGraphml",
  placeholderKey: "editor.placeholderGraphml",
  engineNotReadyKey: "app.engineNotReady",
  detectPriority: 50,
  isFallbackFormat: false,
  supportsSyntaxHighlight: true,
  supportsAutocomplete: false,
  samples: graphmlSampleCatalog,
  get handler() {
    return graphmlFormatHandler;
  },
  site: {
    purposeKey: "site.formats.graphml.purpose",
    featuresKey: "site.formats.graphml.features",
    summaryKey: "site.formats.graphml.summary",
  },
  guide: {
    href: "http://graphml.graphdrawing.org/primer/graphml-primer.html",
    labelKey: "settings.graphmlGuide",
  },
  detectSource(source) {
    const fullLower = source.toLowerCase();
    return (
      fullLower.startsWith("<?xml") &&
      (fullLower.includes("<graphml") || fullLower.includes(":graphml"))
    );
  },
  isCompleteSource(source) {
    return isCompleteGraphmlDocument(source);
  },
};
