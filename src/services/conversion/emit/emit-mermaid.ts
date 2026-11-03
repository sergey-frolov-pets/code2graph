import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  emitMermaidArchitecture,
  emitMermaidBlock,
  emitMermaidC4,
  emitMermaidClass,
  emitMermaidEr,
  emitMermaidFlowchart,
  emitMermaidGantt,
  emitMermaidGitgraph,
  emitMermaidJourney,
  emitMermaidMindmap,
  emitMermaidPacket,
  emitMermaidPie,
  emitMermaidQuadrant,
  emitMermaidRequirement,
  emitMermaidSankey,
  emitMermaidSequence,
  emitMermaidState,
  emitMermaidTimeline,
  emitMermaidXychart,
} from "@/services/conversion/emit/emit-kind-diagrams";

export function emitMermaidFromIr(ir: DiagramIR): string {
  switch (ir.kind) {
    case "class":
    case "object":
      return emitMermaidClass(ir);
    case "state":
      return emitMermaidState(ir);
    case "sequence":
      return emitMermaidSequence(ir);
    case "er":
      return emitMermaidEr(ir);
    case "gantt":
      return emitMermaidGantt(ir);
    case "mindmap":
    case "wbs":
      return emitMermaidMindmap(ir);
    case "pie":
      return emitMermaidPie(ir);
    case "journey":
      return emitMermaidJourney(ir);
    case "gitgraph":
      return emitMermaidGitgraph(ir);
    case "timeline":
    case "timing":
      return emitMermaidTimeline(ir);
    case "sankey":
      return emitMermaidSankey(ir);
    case "xychart":
      return emitMermaidXychart(ir);
    case "block":
      return emitMermaidBlock(ir);
    case "c4_context":
    case "c4_container":
      return emitMermaidC4(ir);
    case "requirement":
      return emitMermaidRequirement(ir);
    case "quadrant":
      return emitMermaidQuadrant(ir);
    case "architecture":
      return emitMermaidArchitecture(ir);
    case "packet":
      return emitMermaidPacket(ir);
    case "activity":
    case "deployment":
    case "usecase":
    case "nwdiag":
    case "archimate":
    case "wireframe":
    case "graph":
    case "unknown":
    default:
      return emitMermaidFlowchart(ir);
  }
}
