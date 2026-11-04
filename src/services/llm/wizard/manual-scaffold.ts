import { scaffoldDiagram } from "@shared/agent-diagram";
import type { AppLocale } from "@/constants/i18n";
import { WIZARD_TYPE_PARAM_FIELDS, type WizardState } from "@/constants/llm-wizard";
import {
  buildGraphmlGraph,
  buildMermaidActivity,
  buildMermaidArchitecture,
  buildMermaidBlock,
  buildMermaidC4Context,
  buildMermaidClass,
  buildMermaidComponent,
  buildMermaidEr,
  buildMermaidFlowchart,
  buildMermaidGantt,
  buildMermaidGitgraph,
  buildMermaidJourney,
  buildMermaidMindmap,
  buildMermaidPacket,
  buildMermaidPie,
  buildMermaidQuadrant,
  buildMermaidRequirement,
  buildMermaidSankey,
  buildMermaidSequence,
  buildMermaidState,
  buildMermaidTimeline,
  buildMermaidXychart,
} from "@/services/llm/wizard/scaffold-mermaid";
import {
  buildPlantUmlActivity,
  buildPlantUmlArchimate,
  buildPlantUmlC4Container,
  buildPlantUmlC4Context,
  buildPlantUmlClass,
  buildPlantUmlComponent,
  buildPlantUmlDeployment,
  buildPlantUmlEr,
  buildPlantUmlGantt,
  buildPlantUmlMindmap,
  buildPlantUmlNwdiag,
  buildPlantUmlObject,
  buildPlantUmlSequence,
  buildPlantUmlState,
  buildPlantUmlTiming,
  buildPlantUmlUsecase,
  buildPlantUmlWbs,
} from "@/services/llm/wizard/scaffold-plantuml";

function scaffoldCount(state: WizardState): number {
  const primary = WIZARD_TYPE_PARAM_FIELDS[state.diagramType][0];
  if (!primary) {
    return 3;
  }

  return state.typeParams[primary.id];
}

export function buildManualScaffold(state: WizardState, locale: AppLocale): string {
  if (
    state.language === "d2" ||
    state.language === "structurizr" ||
    state.language === "wiremark"
  ) {
    return scaffoldDiagram({
      format: state.language,
      diagramType: state.diagramType,
      locale,
      direction: state.direction,
      count: scaffoldCount(state),
    }).source;
  }

  if (state.language === "graphml") {
    return buildGraphmlGraph(state, locale);
  }

  if (state.language === "mermaid") {
    switch (state.diagramType) {
      case "sequence":
        return buildMermaidSequence(state, locale);
      case "class":
        return buildMermaidClass(state, locale);
      case "component":
        return buildMermaidComponent(state, locale);
      case "activity":
        return buildMermaidActivity(state, locale);
      case "state":
        return buildMermaidState(state, locale);
      case "gantt":
        return buildMermaidGantt(state, locale);
      case "mindmap":
        return buildMermaidMindmap(state, locale);
      case "er":
        return buildMermaidEr(state, locale);
      case "flowchart":
        return buildMermaidFlowchart(state, locale);
      case "pie":
        return buildMermaidPie(state, locale);
      case "journey":
        return buildMermaidJourney(state, locale);
      case "gitgraph":
        return buildMermaidGitgraph(state, locale);
      case "timeline":
        return buildMermaidTimeline(state, locale);
      case "sankey":
        return buildMermaidSankey(state, locale);
      case "xychart":
        return buildMermaidXychart(state, locale);
      case "block":
        return buildMermaidBlock(state, locale);
      case "c4_context":
        return buildMermaidC4Context(state, locale);
      case "requirement":
        return buildMermaidRequirement(state, locale);
      case "quadrant":
        return buildMermaidQuadrant(state, locale);
      case "architecture":
        return buildMermaidArchitecture(state, locale);
      case "packet":
        return buildMermaidPacket(state, locale);
      default:
        return buildMermaidFlowchart(state, locale);
    }
  }

  switch (state.diagramType) {
    case "sequence":
      return buildPlantUmlSequence(state, locale);
    case "class":
      return buildPlantUmlClass(state, locale);
    case "component":
      return buildPlantUmlComponent(state, locale);
    case "activity":
      return buildPlantUmlActivity(state, locale);
    case "state":
      return buildPlantUmlState(state, locale);
    case "c4_context":
      return buildPlantUmlC4Context(state, locale);
    case "c4_container":
      return buildPlantUmlC4Container(state, locale);
    case "gantt":
      return buildPlantUmlGantt(state, locale);
    case "mindmap":
      return buildPlantUmlMindmap(state, locale);
    case "er":
      return buildPlantUmlEr(state, locale);
    case "usecase":
      return buildPlantUmlUsecase(state, locale);
    case "deployment":
      return buildPlantUmlDeployment(state, locale);
    case "object":
      return buildPlantUmlObject(state, locale);
    case "timing":
      return buildPlantUmlTiming(state, locale);
    case "wbs":
      return buildPlantUmlWbs(state, locale);
    case "nwdiag":
      return buildPlantUmlNwdiag(state, locale);
    case "archimate":
      return buildPlantUmlArchimate(state, locale);
    default:
      return buildPlantUmlSequence(state, locale);
  }
}
