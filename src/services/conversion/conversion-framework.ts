import {
  DIAGRAM_FORMATS,
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramEdge,
  type DiagramIR,
  type DiagramKind,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import {
  NATIVE_KINDS_BY_FORMAT,
} from "@/services/conversion/diagram-kind-families";
import { emitD2FromIr } from "@/services/conversion/emit/emit-d2";
import { emitGraphmlFromIr } from "@/services/conversion/emit/emit-graphml";
import { emitMermaidFromIr } from "@/services/conversion/emit/emit-mermaid";
import { emitPlantUmlFromIr } from "@/services/conversion/emit/emit-plantuml";
import { emitStructurizrFromIr } from "@/services/conversion/emit/emit-structurizr";
import { emitWiremarkFromIr } from "@/services/conversion/emit/emit-wiremark";
import {
  parseArchimatePlantUml,
  parseArchitectureMermaid,
  parseBlockMermaid,
  parseC4Mermaid,
  parseDeploymentPlantUml,
  parseErPlantUml,
  parseGitgraphMermaid,
  parseJourneyMermaid,
  parseMindmapMermaid,
  parseMindmapPlantUml,
  parseNwdiagPlantUml,
  parseObjectPlantUml,
  parsePacketMermaid,
  parsePieMermaid,
  parseQuadrantMermaid,
  parseRequirementMermaid,
  parseSankeyMermaid,
  parseTimelineMermaid,
  parseTimingPlantUml,
  parseUsecasePlantUml,
  parseWbsPlantUml,
  parseXychartMermaid,
} from "@/services/conversion/parse/kind-parsers";
import { parseD2ToIr } from "@/services/conversion/parse/parse-d2";
import {
  parseActivityMermaid,
  parseClassMermaid,
  parseErMermaid,
  parseFlowchartMermaid,
  parseGanttMermaid,
  parseSequenceMermaid,
  parseStateMermaid,
} from "@/services/conversion/parse/parse-mermaid";
import {
  parseActivityPlantUml,
  parseC4PlantUml,
  parseClassPlantUml,
  parseComponentPlantUml,
  parseGanttPlantUml,
  parseSequencePlantUml,
  parseStatePlantUml,
} from "@/services/conversion/parse/parse-plantuml";
import { parseStructurizrToIr } from "@/services/conversion/parse/parse-structurizr";
import { stripSourceComments } from "@/services/conversion/parse/parse-utils";
import { parseWiremarkToIr } from "@/services/conversion/parse/parse-wiremark";
import {
  getConversionRouteRule,
  type ConversionRouteRule,
} from "@/services/conversion/rules/conversion-matrix";
import { parseGraphml } from "@/services/graphml/graphml-engine";

export interface DiagramConversionAdapter {
  readonly id: DiagramFormat;
  readonly nativeKinds: readonly DiagramKind[];
  classifyKind(source: string): DiagramKind;
  detectDirection(source: string): "TB" | "LR" | undefined;
  parseToIr(source: string, kind: DiagramKind): DiagramIR;
  emitFromIr(ir: DiagramIR): string;
}

function parseGraphmlSource(source: string, format: DiagramFormat): DiagramIR {
  const parsed = parseGraphml(source);
  const usedIds = new Set<string>();
  const nodes: DiagramNode[] = parsed.nodes.map((node) => ({
    id: uniqueDiagramId(node.id, usedIds),
    label: node.label,
    matchConfidence: 1,
  }));

  const idByOriginal = new Map(
    parsed.nodes.map((node, index) => [node.id, nodes[index].id]),
  );

  const edges: DiagramEdge[] = parsed.edges.map((edge, index) => ({
    id: `e${index + 1}`,
    source: idByOriginal.get(edge.source) ?? edge.source,
    target: idByOriginal.get(edge.target) ?? edge.target,
    label: edge.label,
    matchConfidence: 1,
  }));

  return {
    version: CONVERSION_IR_VERSION,
    kind: "graph",
    direction: parsed.direction ?? detectDiagramDirection(source, format),
    nodes,
    edges,
    metadata: { sourceFormat: format },
  };
}

function parsePlantUmlSource(
  cleaned: string,
  kind: DiagramKind,
  format: DiagramFormat,
): DiagramIR {
  switch (kind) {
    case "class":
      return parseClassPlantUml(cleaned, format);
    case "state":
      return parseStatePlantUml(cleaned, format);
    case "sequence":
      return parseSequencePlantUml(cleaned, format);
    case "activity":
      return parseActivityPlantUml(cleaned, format);
    case "c4_context":
    case "c4_container":
      return parseC4PlantUml(cleaned, format);
    case "gantt":
      return parseGanttPlantUml(cleaned, format);
    case "er":
      return parseErPlantUml(cleaned, format);
    case "mindmap":
      return parseMindmapPlantUml(cleaned, format);
    case "usecase":
      return parseUsecasePlantUml(cleaned, format);
    case "deployment":
      return parseDeploymentPlantUml(cleaned, format);
    case "object":
      return parseObjectPlantUml(cleaned, format);
    case "timing":
      return parseTimingPlantUml(cleaned, format);
    case "wbs":
      return parseWbsPlantUml(cleaned, format);
    case "nwdiag":
      return parseNwdiagPlantUml(cleaned, format);
    case "archimate":
      return parseArchimatePlantUml(cleaned, format);
    case "graph":
    default:
      return parseComponentPlantUml(cleaned, format);
  }
}

function parseMermaidSource(
  cleaned: string,
  kind: DiagramKind,
  format: DiagramFormat,
): DiagramIR {
  switch (kind) {
    case "class":
      return parseClassMermaid(cleaned, format);
    case "state":
      return parseStateMermaid(cleaned, format);
    case "sequence":
      return parseSequenceMermaid(cleaned, format);
    case "er":
      return parseErMermaid(cleaned, format);
    case "gantt":
      return parseGanttMermaid(cleaned, format);
    case "activity":
      return parseActivityMermaid(cleaned, format);
    case "mindmap":
      return parseMindmapMermaid(cleaned, format);
    case "pie":
      return parsePieMermaid(cleaned, format);
    case "journey":
      return parseJourneyMermaid(cleaned, format);
    case "gitgraph":
      return parseGitgraphMermaid(cleaned, format);
    case "timeline":
      return parseTimelineMermaid(cleaned, format);
    case "sankey":
      return parseSankeyMermaid(cleaned, format);
    case "xychart":
      return parseXychartMermaid(cleaned, format);
    case "block":
      return parseBlockMermaid(cleaned, format);
    case "c4_context":
      return parseC4Mermaid(cleaned, format, "c4_context");
    case "c4_container":
      return parseC4Mermaid(cleaned, format, "c4_container");
    case "requirement":
      return parseRequirementMermaid(cleaned, format);
    case "quadrant":
      return parseQuadrantMermaid(cleaned, format);
    case "architecture":
      return parseArchitectureMermaid(cleaned, format);
    case "packet":
      return parsePacketMermaid(cleaned, format);
    case "graph":
    default:
      return parseFlowchartMermaid(cleaned, format);
  }
}

const ADAPTERS: Record<DiagramFormat, DiagramConversionAdapter> = {
  plantuml: {
    id: "plantuml",
    nativeKinds: NATIVE_KINDS_BY_FORMAT.plantuml,
    classifyKind: (source) => classifyDiagramKind(source, "plantuml"),
    detectDirection: (source) => detectDiagramDirection(source, "plantuml"),
    parseToIr: (source, kind) => parsePlantUmlSource(source, kind, "plantuml"),
    emitFromIr: emitPlantUmlFromIr,
  },
  mermaid: {
    id: "mermaid",
    nativeKinds: NATIVE_KINDS_BY_FORMAT.mermaid,
    classifyKind: (source) => classifyDiagramKind(source, "mermaid"),
    detectDirection: (source) => detectDiagramDirection(source, "mermaid"),
    parseToIr: (source, kind) => parseMermaidSource(source, kind, "mermaid"),
    emitFromIr: emitMermaidFromIr,
  },
  graphml: {
    id: "graphml",
    nativeKinds: NATIVE_KINDS_BY_FORMAT.graphml,
    classifyKind: (source) => classifyDiagramKind(source, "graphml"),
    detectDirection: (source) => detectDiagramDirection(source, "graphml"),
    parseToIr: (source) => parseGraphmlSource(source, "graphml"),
    emitFromIr: emitGraphmlFromIr,
  },
  d2: {
    id: "d2",
    nativeKinds: NATIVE_KINDS_BY_FORMAT.d2,
    classifyKind: (source) => classifyDiagramKind(source, "d2"),
    detectDirection: (source) => detectDiagramDirection(source, "d2"),
    parseToIr: (source) => parseD2ToIr(source, "d2"),
    emitFromIr: emitD2FromIr,
  },
  structurizr: {
    id: "structurizr",
    nativeKinds: NATIVE_KINDS_BY_FORMAT.structurizr,
    classifyKind: (source) => classifyDiagramKind(source, "structurizr"),
    detectDirection: (source) => detectDiagramDirection(source, "structurizr"),
    parseToIr: (source) => parseStructurizrToIr(source, "structurizr"),
    emitFromIr: emitStructurizrFromIr,
  },
  wiremark: {
    id: "wiremark",
    nativeKinds: NATIVE_KINDS_BY_FORMAT.wiremark,
    classifyKind: (source) => classifyDiagramKind(source, "wiremark"),
    detectDirection: (source) => detectDiagramDirection(source, "wiremark"),
    parseToIr: (source) => parseWiremarkToIr(source, "wiremark"),
    emitFromIr: emitWiremarkFromIr,
  },
};

export function getConversionAdapter(
  format: DiagramFormat,
): DiagramConversionAdapter {
  return ADAPTERS[format];
}

export function listConversionAdapters(): readonly DiagramConversionAdapter[] {
  return DIAGRAM_FORMATS.map((format) => ADAPTERS[format]);
}

export interface TargetFormatAvailability {
  format: DiagramFormat;
  blocked: boolean;
  rule: ConversionRouteRule;
}

export function getAvailableTargetFormats(
  source: string,
  sourceFormat: DiagramFormat,
): TargetFormatAvailability[] {
  const kind = classifyDiagramKind(source, sourceFormat);
  return DIAGRAM_FORMATS.filter((format) => format !== sourceFormat).map(
    (format) => {
      const rule = getConversionRouteRule(kind, sourceFormat, format);
      return {
        format,
        blocked: rule.blocked,
        rule,
      };
    },
  );
}

export function parseSourceWithFramework(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const cleaned = stripSourceComments(source);
  const adapter = getConversionAdapter(format);
  const kind = adapter.classifyKind(cleaned);

  if (
    format !== "graphml" &&
    !getDiagramFormatDefinition(format).supportsStructuralConversion
  ) {
    return {
      ...createEmptyDiagramIR("unknown"),
      metadata: { sourceFormat: format },
    };
  }

  return adapter.parseToIr(cleaned, kind);
}

export function emitIrWithFramework(
  ir: DiagramIR,
  targetFormat: DiagramFormat,
): string {
  const adapter = getConversionAdapter(targetFormat);
  return adapter.emitFromIr(ir);
}
