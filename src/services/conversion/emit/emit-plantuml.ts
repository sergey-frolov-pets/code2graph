import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  emitPlantUmlActivity,
  emitPlantUmlArchimate,
  emitPlantUmlC4,
  emitPlantUmlClass,
  emitPlantUmlDeployment,
  emitPlantUmlEr,
  emitPlantUmlGantt,
  emitPlantUmlGraph,
  emitPlantUmlMindmap,
  emitPlantUmlNwdiag,
  emitPlantUmlObject,
  emitPlantUmlPieAsGraph,
  emitPlantUmlSequence,
  emitPlantUmlState,
  emitPlantUmlTiming,
  emitPlantUmlUsecase,
  emitPlantUmlWbs,
} from "@/services/conversion/emit/emit-kind-diagrams";

export function emitPlantUmlFromIr(ir: DiagramIR): string {
  switch (ir.kind) {
    case "class":
      return emitPlantUmlClass(ir);
    case "state":
      return emitPlantUmlState(ir);
    case "sequence":
      return emitPlantUmlSequence(ir);
    case "gantt":
      return emitPlantUmlGantt(ir);
    case "c4_context":
    case "c4_container":
      return emitPlantUmlC4(ir);
    case "activity":
      return emitPlantUmlActivity(ir);
    case "er":
      return emitPlantUmlEr(ir);
    case "mindmap":
      return emitPlantUmlMindmap(ir);
    case "usecase":
      return emitPlantUmlUsecase(ir);
    case "deployment":
      return emitPlantUmlDeployment(ir);
    case "object":
      return emitPlantUmlObject(ir);
    case "timing":
      return emitPlantUmlTiming(ir);
    case "wbs":
      return emitPlantUmlWbs(ir);
    case "nwdiag":
      return emitPlantUmlNwdiag(ir);
    case "archimate":
      return emitPlantUmlArchimate(ir);
    case "pie":
      return emitPlantUmlPieAsGraph(ir);
    case "graph":
    case "sankey":
    case "block":
    case "architecture":
    case "journey":
    case "gitgraph":
    case "timeline":
    case "xychart":
    case "requirement":
    case "quadrant":
    case "packet":
    case "unknown":
    default:
      return emitPlantUmlGraph(ir);
  }
}
