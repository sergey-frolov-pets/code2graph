import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  createConversionReport,
  type ConversionReport,
} from "@/services/conversion/conversion-report";
import type { ConversionModeKind, DiagramKind } from "@/services/conversion/diagram-ir";
import { getConversionRouteRule } from "@/services/conversion/rules/conversion-matrix";

export interface AnalyzeConversionLossesInput {
  kind: DiagramKind;
  sourceFormat: DiagramFormat;
  targetFormat: DiagramFormat;
  mode: ConversionModeKind;
  visualOnly?: boolean;
  metadataPresent?: boolean;
  unmatchedVisualNodes?: number;
}

export function analyzeConversionLosses(
  input: AnalyzeConversionLossesInput,
): ConversionReport {
  const rule = getConversionRouteRule(
    input.kind,
    input.sourceFormat,
    input.targetFormat,
  );

  const lossIds = [...rule.lossIds];

  if (input.visualOnly) {
    lossIds.push("loss.visualOnly");
  }

  if (input.mode === "combo" && input.unmatchedVisualNodes) {
    for (let index = 0; index < input.unmatchedVisualNodes; index += 1) {
      lossIds.push("loss.nodeVisualMismatch");
    }
  }

  if (input.metadataPresent && input.mode === "metadata") {
    const index = lossIds.indexOf("loss.visualOnly");
    if (index >= 0) {
      lossIds.splice(index, 1);
    }
  }

  const warnings: string[] = [];
  if (rule.blocked) {
    warnings.push("conversion.warning.blocked");
  }

  return createConversionReport({
    sourceFormat: input.sourceFormat,
    targetFormat: input.targetFormat,
    kind: input.kind,
    level: rule.level,
    blocked: rule.blocked,
    lossIds: [...new Set(lossIds)],
    warnings,
    mode: input.mode,
  });
}
