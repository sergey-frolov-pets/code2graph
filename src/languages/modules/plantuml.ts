import { plantUmlFormatHandler } from "@/formats/plantuml/handler";
import { plantUmlSampleCatalog } from "@/constants/plantuml-sample-diagrams";
import type { DiagramLanguageModule } from "@/languages/types";

const PLANTUML_START =
  /@startuml|@enduml|@startgantt|@start(mindmap|wbs|json|yaml|ditaa|salt|dot|chen|nwdiag|chronology|ebnf|regex|board|math|latex)\b/i;

export const plantumlLanguageModule: DiagramLanguageModule = {
  id: "plantuml",
  definition: {
    id: "plantuml",
    language: "plantuml",
    extensions: [".puml", ".plantuml", ".txt"],
    mimeType: "application/vnd.plantuml",
    accept: ".puml,.plantuml,.txt",
    defaultFileName: "diagram.puml",
    editable: true,
    supportsSyntaxValidation: true,
    supportsAiPatch: true,
    supportsAiSyntaxAsk: true,
    supportsSnippets: true,
    supportsSamples: true,
    supportsSaveSource: true,
    supportsOnlineRender: true,
    supportsStructuralConversion: true,
    requiresEngineBoot: true,
  },
  fileBadge: "PUML",
  labelKey: "editor.format.plantuml",
  titleTooltipKey: "editor.titleTooltip.plantuml",
  openFileKey: "editor.openPuml",
  saveFileKey: "app.savePuml",
  placeholderKey: "editor.placeholder",
  engineNotReadyKey: "app.engineNotReady",
  detectPriority: 30,
  isFallbackFormat: true,
  supportsSyntaxHighlight: true,
  supportsAutocomplete: true,
  onlineProbe: "plantuml",
  samples: plantUmlSampleCatalog,
  get handler() {
    return plantUmlFormatHandler;
  },
  site: {
    purposeKey: "site.formats.plantuml.purpose",
    featuresKey: "site.formats.plantuml.features",
  },
  guide: {
    href: "https://plantuml.com/guide",
    labelKey: "settings.plantumlGuide",
  },
  detectSource(source) {
    const fullLower = source.toLowerCase();
    if (
      fullLower.includes("@startuml") ||
      fullLower.includes("@enduml") ||
      fullLower.includes("@startgantt") ||
      PLANTUML_START.test(source)
    ) {
      return true;
    }

    const stripped = source
      .replace(/^(?:%%[^\n]*\n)+/m, "")
      .trim()
      .toLowerCase();
    return stripped.startsWith("graph ") || stripped.startsWith("digraph ");
  },
  isCompleteSource(source) {
    return /@start(uml|gantt)\b/i.test(source);
  },
};
