import type { DiagramFormat } from "@/constants/diagram-formats";
import type { ConversionModeKind, DiagramKind } from "@/services/conversion/diagram-ir";

export type ConversionQualityLevel = "A" | "B" | "C" | "D";

export interface ConversionReport {
  sourceFormat: DiagramFormat;
  targetFormat: DiagramFormat;
  kind: DiagramKind;
  level: ConversionQualityLevel;
  blocked: boolean;
  lossIds: string[];
  warnings: string[];
  mode: ConversionModeKind;
}

export function createConversionReport(
  partial: Omit<ConversionReport, "warnings" | "lossIds"> & {
    lossIds?: string[];
    warnings?: string[];
  },
): ConversionReport {
  return {
    lossIds: partial.lossIds ?? [],
    warnings: partial.warnings ?? [],
    ...partial,
  };
}
