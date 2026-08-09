import type { DiagramFormat } from "@/constants/diagram-formats";
import type { ConversionMode } from "@/services/conversion/pipeline/convert-diagram";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import {
  getConversionRouteRule,
  isConversionBlocked,
} from "@/services/conversion/rules/conversion-matrix";

export function isTargetFormatBlocked(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): boolean {
  const kind = classifyDiagramKind(source, sourceFormat);
  return isConversionBlocked(kind, sourceFormat, targetFormat);
}

export function isVisualModeBlocked(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
  mode: ConversionMode,
): boolean {
  if (mode !== "visual") {
    return false;
  }

  const kind = classifyDiagramKind(source, sourceFormat);
  if (kind === "sequence") {
    return true;
  }

  return getConversionRouteRule(kind, sourceFormat, targetFormat).blocked;
}
