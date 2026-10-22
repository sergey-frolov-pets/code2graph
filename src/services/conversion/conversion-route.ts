import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import type { ConversionMode } from "@/services/conversion/pipeline/convert-diagram";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import {
  getKindAwareRouteRule,
  listTargetKindOptions,
  type TargetKindOption,
} from "@/services/conversion/kind-projection/kind-aware-route";

export function getTargetKindOptions(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): TargetKindOption[] {
  const kind = classifyDiagramKind(source, sourceFormat);
  return listTargetKindOptions(kind, sourceFormat, targetFormat);
}

/** A format is reachable when the source kind or any relevant projected kind can be emitted in it. */
export function isTargetFormatBlocked(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): boolean {
  return getTargetKindOptions(source, sourceFormat, targetFormat).length === 0;
}

export function isVisualModeBlocked(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
  mode: ConversionMode,
  targetKind?: DiagramKind,
): boolean {
  if (mode !== "visual") {
    return false;
  }

  const kind = classifyDiagramKind(source, sourceFormat);
  if (kind === "sequence") {
    return true;
  }

  return getKindAwareRouteRule(kind, sourceFormat, targetFormat, targetKind ?? kind).blocked;
}
