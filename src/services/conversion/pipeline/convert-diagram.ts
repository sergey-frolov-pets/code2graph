import type { DiagramFormat } from "@/constants/diagram-formats";
import type { AppLocale } from "@/constants/i18n";
import {
  CONVERSION_MAX_EDGES,
  CONVERSION_MAX_NODES,
} from "@/constants/conversion-settings";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import type { ConversionReport } from "@/services/conversion/conversion-report";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { wrapConvertedSource } from "@/services/conversion/emit/conversion-header";
import { emitGraphmlFromIr } from "@/services/conversion/emit/emit-graphml";
import { emitMermaidFromIr } from "@/services/conversion/emit/emit-mermaid";
import { emitPlantUmlFromIr } from "@/services/conversion/emit/emit-plantuml";
import { readSvgMetadata } from "@/services/conversion/metadata/svg-metadata";
import { mergeDiagramIrWithVisualHints } from "@/services/conversion/merge/merge-diagram-ir";
import { parseSourceToIr } from "@/services/conversion/parse/parse-source-to-ir";
import { analyzeConversionLosses } from "@/services/conversion/rules/loss-analyzer";
import { isConversionBlocked } from "@/services/conversion/rules/conversion-matrix";
import { extractVisualHintsFromSvg } from "@/services/conversion/visual/svg-extractor";

export type ConversionMode = "source" | "visual" | "combo" | "auto";

export interface ConvertDiagramInput {
  source: string;
  sourceFormat: DiagramFormat;
  targetFormat: DiagramFormat;
  mode?: ConversionMode;
  previewSvg?: string;
  locale: AppLocale;
}

export interface ConvertDiagramResult {
  ok: boolean;
  blocked: boolean;
  targetSource?: string;
  report: ConversionReport;
  ir?: DiagramIR;
}

function resolveMode(input: ConvertDiagramInput): "source" | "visual" | "combo" | "metadata" {
  if (input.mode === "source") {
    return "source";
  }
  if (input.mode === "visual") {
    return "visual";
  }
  if (input.mode === "combo") {
    return "combo";
  }

  if (input.previewSvg?.includes(`id="vueplantuml-ir"`)) {
    return "metadata";
  }
  if (input.previewSvg) {
    return "combo";
  }
  return "source";
}

function emitIrToSource(ir: DiagramIR, targetFormat: DiagramFormat): string {
  switch (targetFormat) {
    case "graphml":
      return emitGraphmlFromIr(ir);
    case "mermaid":
      return emitMermaidFromIr(ir);
    case "plantuml":
      return emitPlantUmlFromIr(ir);
    default:
      return "";
  }
}

function enforceLimits(ir: DiagramIR): DiagramIR {
  return {
    ...ir,
    nodes: ir.nodes.slice(0, CONVERSION_MAX_NODES),
    edges: ir.edges.slice(0, CONVERSION_MAX_EDGES),
  };
}

export function buildDiagramIrForCache(
  source: string,
  sourceFormat: DiagramFormat,
  previewSvg?: string,
): DiagramIR {
  const kind = classifyDiagramKind(source, sourceFormat);
  let semantic = parseSourceToIr(source, sourceFormat);
  semantic = enforceLimits({ ...semantic, kind });

  if (!previewSvg) {
    return semantic;
  }

  const visual = extractVisualHintsFromSvg(previewSvg, sourceFormat);
  return mergeDiagramIrWithVisualHints(semantic, visual).ir;
}

export function convertDiagram(input: ConvertDiagramInput): ConvertDiagramResult {
  const mode = resolveMode(input);
  const kind = classifyDiagramKind(input.source, input.sourceFormat);
  const metadataIr = input.previewSvg ? readSvgMetadata(input.previewSvg) : null;

  const preliminaryReport = analyzeConversionLosses({
    kind,
    sourceFormat: input.sourceFormat,
    targetFormat: input.targetFormat,
    mode: mode === "metadata" ? "metadata" : mode,
    visualOnly: mode === "visual",
    metadataPresent: Boolean(metadataIr),
  });

  if (
    preliminaryReport.blocked ||
    isConversionBlocked(kind, input.sourceFormat, input.targetFormat)
  ) {
    return {
      ok: false,
      blocked: true,
      report: preliminaryReport,
    };
  }

  let semantic: DiagramIR;
  if (metadataIr && (mode === "metadata" || mode === "combo")) {
    semantic = metadataIr;
  } else if (mode === "visual" && input.previewSvg) {
    const hints = extractVisualHintsFromSvg(input.previewSvg, input.sourceFormat);
    semantic = {
      version: 1,
      kind,
      nodes: hints.nodes.map((node, index) => ({
        id: node.semanticId ?? `n${index + 1}`,
        label: node.label,
        visual: {
          x: node.bbox.x,
          y: node.bbox.y,
          width: node.bbox.width,
          height: node.bbox.height,
          fill: node.fill,
          stroke: node.stroke,
          shape: node.shape,
        },
        matchConfidence: 0.4,
      })),
      edges: [],
      metadata: { sourceFormat: input.sourceFormat, conversionMode: "visual" },
    };
  } else {
    semantic = parseSourceToIr(input.source, input.sourceFormat);
  }

  semantic = enforceLimits(semantic);
  let unmatchedVisualNodes = 0;

  if (
    (mode === "combo" || mode === "metadata") &&
    input.previewSvg
  ) {
    const visual = extractVisualHintsFromSvg(input.previewSvg, input.sourceFormat);
    const merged = mergeDiagramIrWithVisualHints(semantic, visual);
    semantic = merged.ir;
    unmatchedVisualNodes = merged.unmatchedVisualNodes;
  }

  const report = analyzeConversionLosses({
    kind: semantic.kind,
    sourceFormat: input.sourceFormat,
    targetFormat: input.targetFormat,
    mode: mode === "metadata" ? "metadata" : mode,
    visualOnly: mode === "visual",
    metadataPresent: Boolean(metadataIr),
    unmatchedVisualNodes,
  });

  const rawTarget = emitIrToSource(semantic, input.targetFormat);
  if (!rawTarget.trim()) {
    return {
      ok: false,
      blocked: true,
      report,
      ir: semantic,
    };
  }

  const targetSource = wrapConvertedSource(
    rawTarget,
    input.targetFormat,
    report,
    input.locale,
  );

  return {
    ok: true,
    blocked: false,
    targetSource,
    report,
    ir: semantic,
  };
}
