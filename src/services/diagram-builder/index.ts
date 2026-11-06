import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramTypeTag } from "@/constants/diagram-example-catalog";
import { detectType as detectMermaidExtType } from "@/services/mermaid/ext/registry";
import {
  createDefaultBuilderState,
  emitMermaidExtFromBuilderState,
  parseMermaidExtToBuilderState,
} from "./codec-mermaid-ext";
import {
  emitStandardDiagramFromBuilderState,
  parseStandardDiagramToBuilderState,
} from "./codec-standard";
import {
  ASPECT_RATIO_OPTIONS,
  CAGR_FORMAT_OPTIONS,
  detectBuilderDiagramType,
  getDiagramBuilderSchema,
  GRAPH_EDGE_KIND_OPTIONS,
  GRAPH_NODE_KIND_OPTIONS,
  hasBuilderOptionsCapabilities,
  LINE_STYLE_OPTIONS,
  MONO_MODE_OPTIONS,
  supportsDiagramBuilder,
} from "./schemas";
import {
  parseRawTextToGrid,
  serializeGridToClipboardTsv,
  transposeMatrixData,
} from "./table-clipboard";
import type { DiagramBuilderState } from "./types";

export * from "./types";
export {
  ASPECT_RATIO_OPTIONS,
  CAGR_FORMAT_OPTIONS,
  createDefaultBuilderState,
  detectBuilderDiagramType,
  getDiagramBuilderSchema,
  GRAPH_EDGE_KIND_OPTIONS,
  GRAPH_NODE_KIND_OPTIONS,
  hasBuilderOptionsCapabilities,
  LINE_STYLE_OPTIONS,
  MONO_MODE_OPTIONS,
  parseRawTextToGrid,
  serializeGridToClipboardTsv,
  supportsDiagramBuilder,
  transposeMatrixData,
};

const MERMAID_EXT_TYPES = new Set<string>([
  "waterfall",
  "bubble",
  "heatmap",
  "orgchart",
  "ev",
  "boxplot",
  "treemap",
  "radar",
  "voronoi",
  "series",
]);

export function parseSourceToBuilderState(
  source: string,
  format: DiagramFormat,
  explicitDiagramType?: DiagramTypeTag,
): DiagramBuilderState {
  const diagramType =
    explicitDiagramType ?? detectBuilderDiagramType(source, format);

  if (format === "mermaid" && MERMAID_EXT_TYPES.has(diagramType)) {
    const extType = detectMermaidExtType(source) ?? diagramType;
    const parsedExt = parseMermaidExtToBuilderState(source, extType);
    if (parsedExt) {
      return parsedExt;
    }
  }

  return parseStandardDiagramToBuilderState(source, format, diagramType);
}

export function emitSourceFromBuilderState(
  state: DiagramBuilderState,
  originalSource = "",
): string {
  if (state.format === "mermaid" && MERMAID_EXT_TYPES.has(state.diagramType)) {
    const emitted = emitMermaidExtFromBuilderState(state);
    if (emitted !== null) {
      return emitted;
    }
  }

  return emitStandardDiagramFromBuilderState(state, originalSource);
}
