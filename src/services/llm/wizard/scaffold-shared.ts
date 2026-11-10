import type { AppLocale } from "@/constants/i18n";
import { wizardCopy } from "@/services/llm/wizard/wizard-copy";
import type {
  WizardDiagramDirection,
  WizardDiagramTheme,
  WizardState,
  WizardStructuralElementId,
} from "@/constants/llm-wizard";

export const SWIMLANE_COLORS = [
  "#E3F2FD",
  "#E8F5E9",
  "#FFF3E0",
  "#FCE4EC",
  "#EDE7F6",
  "#E0F7FA",
  "#FFF9C4",
  "#F3E5F5",
] as const;

export function buildPlantUmlThemeBlock(theme: WizardDiagramTheme): string[] {
  if (theme === "dark") {
    return [
      "skinparam backgroundColor #1e1e1e",
      "skinparam defaultFontColor #eeeeee",
      "skinparam shadowing false",
    ];
  }

  return [];
}

export function buildPlantUmlDirectionLine(
  direction: WizardDiagramDirection,
): string | null {
  if (direction === "LR") {
    return "left to right direction";
  }

  return "top to bottom direction";
}

export function buildPlantUmlHeader(
  state: WizardState,
  title: string,
  includeDirection: boolean,
  includeLayoutPragma = true,
): string[] {
  const lines = ["@startuml"];

  if (includeLayoutPragma) {
    lines.push("!pragma layout smetana", "");
  }

  lines.push(`title ${title}`, "", ...buildPlantUmlThemeBlock(state.theme));

  if (includeDirection) {
    const directionLine = buildPlantUmlDirectionLine(state.direction);
    if (directionLine) {
      lines.push(directionLine, "");
    }
  }

  return lines;
}

export function participantLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "participant")} ${index}`;
}

export function classLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "class")}${index}`;
}

export function componentLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "component")} ${index}`;
}

export function laneLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "lane")} ${index}`;
}

export function stepLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "step")} ${index}`;
}

export function stateLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "state")} ${index}`;
}

export function plantUmlStateAlias(index: number): string {
  return `wizard_state_${index}`;
}

export function plantUmlStateDeclaration(index: number, locale: AppLocale): string {
  const label = stateLabel(index, locale);
  return `state "${label.replace(/"/g, '\\"')}" as ${plantUmlStateAlias(index)}`;
}

export function plantUmlStateRef(index: number, _locale?: AppLocale): string {
  return plantUmlStateAlias(index);
}

export function actorLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "actor")} ${index}`;
}

export function externalSystemLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "externalSystem")} ${index}`;
}

export function containerLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "container")} ${index}`;
}

export function nodeLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "node")} ${index}`;
}

export function taskLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "task")} ${index}`;
}

export function entityLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "entity")} ${index}`;
}

export function branchLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "branch")} ${index}`;
}

export function subBranchLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "subBranch")} ${index}`;
}

export function sliceLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "slice")} ${index}`;
}

export function eventLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "event")} ${index}`;
}

export function commitLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "commit")} ${index}`;
}

export function useCaseLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "useCase")} ${index}`;
}

export function serverLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "server")} ${index}`;
}

export function signalLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "signal")} ${index}`;
}

export function fieldLabel(index: number, locale: AppLocale): string {
  return `${wizardCopy(locale, "field")} ${index}`;
}

export function hasStructural(
  state: WizardState,
  elementId: WizardStructuralElementId,
): boolean {
  return state.structuralElements[elementId] === true;
}

export function appendPlantUmlSequenceStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const from = participantLabel(1, locale).replace(/\s+/g, "_");
  const to = participantLabel(2, locale).replace(/\s+/g, "_");
  const ok = wizardCopy(locale, "success");
  const fail = wizardCopy(locale, "failure");
  const noteText = wizardCopy(locale, "note");

  if (hasStructural(state, "note")) {
    lines.push("", `note right of ${from}: ${noteText}`);
  }

  if (hasStructural(state, "alt")) {
    lines.push(
      "",
      `alt ${ok}`,
      `  ${from} -> ${to}: ${ok}`,
      "else " + fail,
      `  ${from} -> ${to}: ${fail}`,
      "end",
    );
  }

  if (hasStructural(state, "loop")) {
    const retry = wizardCopy(locale, "retry");
    lines.push("", `loop ${retry}`, `  ${from} -> ${to}: ${retry}`, "end");
  }

  if (hasStructural(state, "opt")) {
    const optional = wizardCopy(locale, "optional");
    lines.push("", `opt ${optional}`, `  ${from} -> ${to}: ${optional}`, "end");
  }

  if (hasStructural(state, "par")) {
    const parallel = wizardCopy(locale, "parallel");
    lines.push(
      "",
      "par " + parallel,
      `  ${from} -> ${to}: A`,
      `  ${from} -> ${to}: B`,
      "end",
    );
  }
}

export function appendMermaidSequenceStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const from = participantLabel(1, locale).replace(/\s+/g, "_");
  const to = participantLabel(2, locale).replace(/\s+/g, "_");
  const ok = wizardCopy(locale, "success");
  const fail = wizardCopy(locale, "failure");

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push(`  Note right of ${from}: ${noteText}`);
  }

  if (hasStructural(state, "alt")) {
    lines.push(
      `  alt ${ok}`,
      `    ${from}->>${to}: ${ok}`,
      `  else ${fail}`,
      `    ${from}->>${to}: ${fail}`,
      "  end",
    );
  }

  if (hasStructural(state, "loop")) {
    const retry = wizardCopy(locale, "retry");
    lines.push(`  loop ${retry}`, `    ${from}->>${to}: ${retry}`, "  end");
  }

  if (hasStructural(state, "opt")) {
    const optional = wizardCopy(locale, "optional");
    lines.push(`  opt ${optional}`, `    ${from}->>${to}: ${optional}`, "  end");
  }

  if (hasStructural(state, "par")) {
    lines.push(
      "  par",
      `    ${from}->>${to}: A`,
      `    ${from}->>${to}: B`,
      "  end",
    );
  }
}

export function appendPlantUmlClassStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const noteText = wizardCopy(locale, "note");

  if (hasStructural(state, "interface")) {
    const iface = wizardCopy(locale, "interface");
    lines.push("", `interface ${iface} {`, "  +method()", "}");
  }

  if (hasStructural(state, "enum")) {
    const enumName = wizardCopy(locale, "status");
    lines.push("", `enum ${enumName} {`, "  ACTIVE", "  INACTIVE", "}");
  }

  if (hasStructural(state, "abstract")) {
    const abstractName = wizardCopy(locale, "baseClass");
    lines.push("", `abstract class ${abstractName} {`, "  +id: String", "}");
  }

  if (hasStructural(state, "note")) {
    lines.push("", `note top of ${classLabel(1, locale)}: ${noteText}`);
  }
}

export function appendPlantUmlComponentStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const noteText = wizardCopy(locale, "note");

  if (hasStructural(state, "interface")) {
    const iface = wizardCopy(locale, "interface");
    lines.push("", `() ${iface}`, "");
  }

  if (hasStructural(state, "note")) {
    lines.push(`note right of [${componentLabel(1, locale)}]: ${noteText}`);
  }
}

export function appendPlantUmlActivityStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const noteText = wizardCopy(locale, "note");
  const yes = wizardCopy(locale, "yes");
  const no = wizardCopy(locale, "no");
  const caseA = wizardCopy(locale, "caseA");
  const caseB = wizardCopy(locale, "caseB");

  if (hasStructural(state, "if")) {
    lines.push("", `if (${yes}?) then (${yes})`, `  :${stepLabel(1, locale)};`, "else (" + no + ")", `  :${stepLabel(2, locale)};`, "endif");
  }

  if (hasStructural(state, "switch")) {
    lines.push(
      "",
      "switch (" + caseA + ")",
      "case (" + caseA + ")",
      `  :${stepLabel(1, locale)};`,
      "case (" + caseB + ")",
      `  :${stepLabel(2, locale)};`,
      "endswitch",
    );
  }

  if (hasStructural(state, "fork")) {
    lines.push("", "fork", `  :${stepLabel(1, locale)};`, "fork again", `  :${stepLabel(2, locale)};`, "end fork");
  }

  if (hasStructural(state, "note")) {
    lines.push("", `floating note right: ${noteText}`);
  }

  if (hasStructural(state, "artifact")) {
    const artifact = wizardCopy(locale, "artifact");
    lines.push("", `:${artifact};`, "<<artifact>>");
  }
}

export function appendMermaidFlowStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const yes = wizardCopy(locale, "yesCap");
  const no = wizardCopy(locale, "noCap");

  if (hasStructural(state, "if")) {
    lines.push("  B{Decision?}", `  B -->|${yes}| N1`, `  B -->|${no}| Z`);
  }

  if (hasStructural(state, "fork")) {
    lines.push("  F{{Fork}}", "  F --> N1", "  F --> N2");
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push(`  N1@{ shape: braces, label: "${noteText}" }`);
  }
}

export function appendPlantUmlStateStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "choice")) {
    lines.push(
      "",
      "state wizard_choice <<choice>>",
      `${plantUmlStateRef(1, locale)} --> wizard_choice`,
      `wizard_choice --> ${plantUmlStateRef(2, locale)}`,
    );
  }

  if (hasStructural(state, "fork")) {
    lines.push(
      "",
      "state wizard_fork <<fork>>",
      `${plantUmlStateRef(1, locale)} --> wizard_fork`,
      `wizard_fork --> ${plantUmlStateRef(2, locale)}`,
    );
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of ${plantUmlStateRef(1, locale)}: ${noteText}`);
  }
}

export function appendPlantUmlGanttStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "section")) {
    const section = wizardCopy(locale, "phase2");
    lines.push("", "[" + section + "] lasts 2 days");
  }

  if (hasStructural(state, "milestone")) {
    const milestone = wizardCopy(locale, "milestone");
    lines.push("", `[${milestone}] happens at [${taskLabel(1, locale)}]'s end`);
  }
}

export function appendMermaidGanttStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "section")) {
    const section = wizardCopy(locale, "phase2");
    lines.push("", `section ${section}`, `${taskLabel(2, locale)} :t2, after t1, 2d`);
  }

  if (hasStructural(state, "milestone")) {
    const milestone = wizardCopy(locale, "milestone");
    lines.push("", `${milestone} :milestone, after t1, 0d`);
  }
}

export function appendGraphmlClusterStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (!hasStructural(state, "cluster")) {
    return;
  }

  const clusterLabel = wizardCopy(locale, "cluster");
  lines.splice(
    lines.length - 2,
    0,
    `    <node id="cluster1">`,
    `      <data key="d0">${clusterLabel}</data>`,
    `      <graph id="cluster1_graph" edgedefault="directed">`,
    `        <node id="n1"><data key="d0">${nodeLabel(1, locale)}</data></node>`,
    `      </graph>`,
    `    </node>`,
  );
}
