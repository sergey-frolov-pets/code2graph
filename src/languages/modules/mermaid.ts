import { mermaidSampleCatalog } from "@/constants/mermaid-sample-diagrams";
import { mermaidFormatHandler } from "@/formats/mermaid/handler";
import type { DiagramLanguageModule } from "@/languages/types";
import { isCompleteMermaidDiagram } from "@/utils/mermaid-source";

const MERMAID_TYPE =
  /^(graph|flowchart|sequencediagram|classdiagram|statediagram|erdiagram|journey|gantt|pie|mindmap|timeline|gitgraph|sankey-beta|xychart-beta|block-beta)\b/i;

export const mermaidLanguageModule: DiagramLanguageModule = {
  id: "mermaid",
  definition: {
    id: "mermaid",
    language: "mermaid",
    extensions: [".mmd", ".mermaid"],
    mimeType: "text/vnd.mermaid",
    accept: ".mmd,.mermaid",
    defaultFileName: "diagram.mmd",
    editable: true,
    supportsSyntaxValidation: true,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: false,
    supportsSamples: true,
    supportsSaveSource: true,
    supportsOnlineRender: true,
    supportsStructuralConversion: true,
    requiresEngineBoot: true,
  },
  fileBadge: "MMD",
  labelKey: "editor.format.mermaid",
  titleTooltipKey: "editor.titleTooltip.mermaid",
  openFileKey: "editor.openMermaid",
  saveFileKey: "editor.saveMermaid",
  placeholderKey: "editor.placeholderMermaid",
  engineNotReadyKey: "app.mermaidEngineNotReady",
  detectPriority: 40,
  isFallbackFormat: false,
  supportsSyntaxHighlight: true,
  supportsAutocomplete: true,
  onlineProbe: "mermaid",
  samples: mermaidSampleCatalog,
  get handler() {
    return mermaidFormatHandler;
  },
  site: {
    purposeKey: "site.formats.mermaid.purpose",
    featuresKey: "site.formats.mermaid.features",
  },
  guide: {
    href: "https://mermaid.js.org/intro/",
    labelKey: "settings.mermaidGuide",
  },
  detectSource(source) {
    const withoutComments = source.replace(/^(?:%%[^\n]*\n)+/m, "").trim();
    const lower = withoutComments.toLowerCase();
    return (
      lower.startsWith("```mermaid") || MERMAID_TYPE.test(withoutComments)
    );
  },
  isCompleteSource(source) {
    return isCompleteMermaidDiagram(source);
  },
};
