import type { DiagramLanguage } from "@/constants/diagram-library";

export const DIAGRAM_FORMATS = ["plantuml", "mermaid", "graphml"] as const;

export type DiagramFormat = (typeof DIAGRAM_FORMATS)[number];

export function isDiagramFormat(value: string): value is DiagramFormat {
  return (DIAGRAM_FORMATS as readonly string[]).includes(value);
}

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
  usesPlantUmlEngine: boolean;
  supportsOnlineRender: boolean;
}

export const DIAGRAM_FORMAT_DEFINITIONS: Record<
  DiagramFormat,
  DiagramFormatDefinition
> = {
  plantuml: {
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
    usesPlantUmlEngine: true,
    supportsOnlineRender: true,
  },
  mermaid: {
    id: "mermaid",
    language: "mermaid",
    extensions: [".mmd", ".mermaid"],
    mimeType: "text/vnd.mermaid",
    accept: ".mmd,.mermaid",
    defaultFileName: "diagram.mmd",
    editable: true,
    supportsSyntaxValidation: false,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: false,
    supportsSamples: true,
    supportsSaveSource: true,
    usesPlantUmlEngine: false,
    supportsOnlineRender: true,
  },
  graphml: {
    id: "graphml",
    language: "graphml",
    extensions: [".graphml"],
    mimeType: "application/graphml+xml",
    accept: ".graphml",
    defaultFileName: "diagram.graphml",
    editable: false,
    supportsSyntaxValidation: false,
    supportsAiPatch: false,
    supportsAiSyntaxAsk: false,
    supportsSnippets: false,
    supportsSamples: false,
    supportsSaveSource: false,
    usesPlantUmlEngine: false,
    supportsOnlineRender: false,
  },
};

export const DIAGRAM_FILE_ACCEPT = Object.values(DIAGRAM_FORMAT_DEFINITIONS)
  .map((definition) => definition.accept)
  .join(",");

export function getDiagramFormatDefinition(
  format: DiagramFormat,
): DiagramFormatDefinition {
  return DIAGRAM_FORMAT_DEFINITIONS[format];
}

export function detectFormatFromFileName(fileName: string): DiagramFormat | null {
  const lowerName = fileName.toLowerCase();

  for (const definition of Object.values(DIAGRAM_FORMAT_DEFINITIONS)) {
    if (definition.extensions.some((extension) => lowerName.endsWith(extension))) {
      return definition.id;
    }
  }

  return null;
}
