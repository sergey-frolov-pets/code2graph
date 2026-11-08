import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import { detectDiagramFormatFromSource } from "@/utils/diagram-format";

export interface RecognizedDiagramSource {
  format: DiagramFormat;
  kind: DiagramKind;
}

/** A clipboard payload is a diagram only when both the language and the kind are supported. */
export function recognizeDiagramSource(source: string): RecognizedDiagramSource | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  const format = detectDiagramFormatFromSource(trimmed);
  if (!format) {
    return null;
  }

  const kind = classifyDiagramKind(trimmed, format);
  if (kind === "unknown") {
    return null;
  }

  return { format, kind };
}
