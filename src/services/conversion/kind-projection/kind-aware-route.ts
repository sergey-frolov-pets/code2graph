import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import { isFormatNativeKind } from "@/services/conversion/diagram-kind-families";
import {
  getKindProjectionRule,
  listProjectableKindsForFormat,
  worstQualityLevel,
} from "@/services/conversion/kind-projection/kind-projection-rules";
import {
  getConversionRouteRule,
  type ConversionRouteRule,
} from "@/services/conversion/rules/conversion-matrix";

const TARGET_SYNTAX_LOSS_IDS: ReadonlySet<string> = new Set([
  "loss.unsupportedKind",
  "loss.mermaidOnlySyntax",
  "loss.plantumlOnlySyntax",
]);

const UNSUPPORTED_ROUTE: ConversionRouteRule = {
  level: "D",
  blocked: true,
  lossIds: ["loss.unsupportedKind"],
};

/**
 * Route rule for "source kind in source format" → "target kind in target
 * format". Without a kind change it is the plain format matrix; with one it
 * combines the projection rule with the target-kind format rule.
 */
export function getKindAwareRouteRule(
  sourceKind: DiagramKind,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
  targetKind: DiagramKind = sourceKind,
): ConversionRouteRule {
  if (targetKind === sourceKind) {
    return getConversionRouteRule(sourceKind, sourceFormat, targetFormat);
  }

  const projection = getKindProjectionRule(sourceKind, targetKind);
  if (!projection || !isFormatNativeKind(targetFormat, targetKind)) {
    return UNSUPPORTED_ROUTE;
  }

  const projectionRule: ConversionRouteRule = {
    level: projection.level,
    blocked: false,
    lossIds: [...projection.lossIds],
  };
  if (sourceFormat === targetFormat) {
    return projectionRule;
  }

  // What the source format loses on export still applies; "no native syntax"
  // losses do not, because the target kind is native in the target format.
  const sourceExportRule = getConversionRouteRule(sourceKind, sourceFormat, targetFormat);
  if (sourceExportRule.blocked) {
    return projectionRule;
  }

  const exportLosses = sourceExportRule.lossIds.filter(
    (lossId) => !TARGET_SYNTAX_LOSS_IDS.has(lossId),
  );
  return {
    level: worstQualityLevel(projection.level, sourceExportRule.level),
    blocked: false,
    lossIds: [...new Set([...projection.lossIds, ...exportLosses])],
  };
}

export interface TargetKindOption {
  kind: DiagramKind;
  rule: ConversionRouteRule;
  isSourceKind: boolean;
}

/** Source kind first (when the route is open), then relevant projections the format renders natively. */
export function listTargetKindOptions(
  sourceKind: DiagramKind,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): TargetKindOption[] {
  const options: TargetKindOption[] = [];
  const sameKindRule = getConversionRouteRule(sourceKind, sourceFormat, targetFormat);
  if (!sameKindRule.blocked) {
    options.push({ kind: sourceKind, rule: sameKindRule, isSourceKind: true });
  }
  for (const kind of listProjectableKindsForFormat(sourceKind, targetFormat)) {
    const rule = getKindAwareRouteRule(sourceKind, sourceFormat, targetFormat, kind);
    if (!rule.blocked) {
      options.push({ kind, rule, isSourceKind: false });
    }
  }
  return options;
}
