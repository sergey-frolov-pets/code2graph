import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  emitMermaidArchitecture,
  emitMermaidBlock,
  emitMermaidC4,
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
  emitMermaidTimeline,
  emitMermaidXychart,
  emitMermaidClass,
  emitMermaidSequence,
  emitMermaidState,
} from "@/services/conversion/emit/emit-kind-diagrams";

export function emitMermaidFromIr(ir: DiagramIR): string {
  switch (ir.kind) {
    case "class":
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
      return emitMermaidMindmap(ir);
    case "pie":
      return emitMermaidPie(ir);
    case "journey":
      return emitMermaidJourney(ir);
    case "gitgraph":
      return emitMermaidGitgraph(ir);
    case "timeline":
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
    case "graph":
    case "unknown":
    default:
      return emitMermaidFlowchart(ir);
  }
}
