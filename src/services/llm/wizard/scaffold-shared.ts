import type { AppLocale } from "@/constants/i18n";
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
): string[] {
  const lines = [
    "@startuml",
    "!pragma layout smetana",
    "",
    `title ${title}`,
    "",
    ...buildPlantUmlThemeBlock(state.theme),
  ];

  if (includeDirection) {
    const directionLine = buildPlantUmlDirectionLine(state.direction);
    if (directionLine) {
      lines.push(directionLine, "");
    }
  }

  return lines;
}

export function participantLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Участник ${index}` : `Participant ${index}`;
}

export function classLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Класс${index}` : `Class${index}`;
}

export function componentLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Компонент ${index}` : `Component ${index}`;
}

export function laneLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Дорожка ${index}` : `Lane ${index}`;
}

export function stepLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Шаг ${index}` : `Step ${index}`;
}

export function stateLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Состояние ${index}` : `State ${index}`;
}

export function actorLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Актор ${index}` : `Actor ${index}`;
}

export function externalSystemLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Внешняя система ${index}` : `External system ${index}`;
}

export function containerLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Контейнер ${index}` : `Container ${index}`;
}

export function nodeLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Узел ${index}` : `Node ${index}`;
}

export function taskLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Задача ${index}` : `Task ${index}`;
}

export function entityLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Сущность ${index}` : `Entity ${index}`;
}

export function branchLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Ветка ${index}` : `Branch ${index}`;
}

export function subBranchLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Подветка ${index}` : `Sub-branch ${index}`;
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
  const ok = locale === "ru" ? "успех" : "success";
  const fail = locale === "ru" ? "ошибка" : "failure";
  const noteText = locale === "ru" ? "Примечание" : "Note";

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
    const retry = locale === "ru" ? "повтор" : "retry";
    lines.push("", `loop ${retry}`, `  ${from} -> ${to}: ${retry}`, "end");
  }

  if (hasStructural(state, "opt")) {
    const optional = locale === "ru" ? "опционально" : "optional";
    lines.push("", `opt ${optional}`, `  ${from} -> ${to}: ${optional}`, "end");
  }

  if (hasStructural(state, "par")) {
    const parallel = locale === "ru" ? "параллельно" : "parallel";
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
  const ok = locale === "ru" ? "успех" : "success";
  const fail = locale === "ru" ? "ошибка" : "failure";

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
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
    const retry = locale === "ru" ? "повтор" : "retry";
    lines.push(`  loop ${retry}`, `    ${from}->>${to}: ${retry}`, "  end");
  }

  if (hasStructural(state, "opt")) {
    const optional = locale === "ru" ? "опционально" : "optional";
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
  const noteText = locale === "ru" ? "Примечание" : "Note";

  if (hasStructural(state, "interface")) {
    const iface = locale === "ru" ? "Интерфейс" : "Interface";
    lines.push("", `interface ${iface} {`, "  +method()", "}");
  }

  if (hasStructural(state, "enum")) {
    const enumName = locale === "ru" ? "Статус" : "Status";
    lines.push("", `enum ${enumName} {`, "  ACTIVE", "  INACTIVE", "}");
  }

  if (hasStructural(state, "abstract")) {
    const abstractName = locale === "ru" ? "БазовыйКласс" : "BaseClass";
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
  const noteText = locale === "ru" ? "Примечание" : "Note";

  if (hasStructural(state, "interface")) {
    const iface = locale === "ru" ? "Интерфейс" : "Interface";
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
  const noteText = locale === "ru" ? "Примечание" : "Note";
  const yes = locale === "ru" ? "да" : "yes";
  const no = locale === "ru" ? "нет" : "no";
  const caseA = locale === "ru" ? "вариант A" : "case A";
  const caseB = locale === "ru" ? "вариант B" : "case B";

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
    const artifact = locale === "ru" ? "Артефакт" : "Artifact";
    lines.push("", `:${artifact};`, "<<artifact>>");
  }
}

export function appendMermaidFlowStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const yes = locale === "ru" ? "Да" : "Yes";
  const no = locale === "ru" ? "Нет" : "No";

  if (hasStructural(state, "if")) {
    lines.push("  B{Decision?}", `  B -->|${yes}| N1`, `  B -->|${no}| Z`);
  }

  if (hasStructural(state, "fork")) {
    lines.push("  F{{Fork}}", "  F --> N1", "  F --> N2");
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  N1@{ shape: braces, label: "${noteText}" }`);
  }
}

export function appendPlantUmlStateStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "choice")) {
    lines.push("", stateLabel(1, locale) + " --> choice");
    lines.push("choice --> " + stateLabel(2, locale));
  }

  if (hasStructural(state, "fork")) {
    lines.push("", stateLabel(1, locale) + " --> fork");
    lines.push("fork --> " + stateLabel(2, locale));
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of ${stateLabel(1, locale)}: ${noteText}`);
  }
}

export function appendPlantUmlGanttStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "section")) {
    const section = locale === "ru" ? "Этап 2" : "Phase 2";
    lines.push("", "[" + section + "] lasts 2 days");
  }

  if (hasStructural(state, "milestone")) {
    const milestone = locale === "ru" ? "Веха" : "Milestone";
    lines.push("", `[${milestone}] happens at [${taskLabel(1, locale)}]'s end`);
  }
}

export function appendMermaidGanttStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "section")) {
    const section = locale === "ru" ? "Этап 2" : "Phase 2";
    lines.push("", `section ${section}`, `${taskLabel(2, locale)} :t2, after t1, 2d`);
  }

  if (hasStructural(state, "milestone")) {
    const milestone = locale === "ru" ? "Веха" : "Milestone";
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

  const clusterLabel = locale === "ru" ? "Группа" : "Cluster";
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
