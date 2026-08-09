import type { AppLocale } from "@/constants/i18n";
import type { WizardState } from "@/constants/llm-wizard";
import {
  buildGraphmlGraph,
  buildMermaidActivity,
  buildMermaidClass,
  buildMermaidComponent,
  buildMermaidEr,
  buildMermaidFlowchart,
  buildMermaidGantt,
  buildMermaidMindmap,
  buildMermaidSequence,
  buildMermaidState,
} from "@/services/llm/wizard/scaffold-mermaid";
import {
  buildPlantUmlActivity,
  buildPlantUmlC4Container,
  buildPlantUmlC4Context,
  buildPlantUmlClass,
  buildPlantUmlComponent,
  buildPlantUmlGantt,
  buildPlantUmlMindmap,
  buildPlantUmlSequence,
  buildPlantUmlState,
} from "@/services/llm/wizard/scaffold-plantuml";

export function buildManualScaffold(state: WizardState, locale: AppLocale): string {
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
    default:
      return buildPlantUmlSequence(state, locale);
  }
}

