import type {
  WizardDiagramType,
  WizardLanguage,
  WizardParamId,
} from "@/constants/llm-wizard";

export type DiagramFormatTypeParams = Partial<Record<WizardParamId, number>>;

const SHARED_COMPLETENESS_RULES = [
  "Completeness (critical):",
  "- Build a FULL diagram from the user's Description and Additional requirements — not a minimal valid sketch.",
  "- Include EVERY named entity, step, actor, branch, or concept from the user text; do not abbreviate or omit details to save space.",
  "- Match the user's language for all labels and titles.",
  "- Use short node labels (≤8 words); put organizing rationale in the optional explanation field.",
  "- Balance structure — avoid one dominant branch and empty stubs.",
];

const SHARED_GUARDRAILS = [
  "Guardrails:",
  "- Preserve accuracy; do not invent facts not implied by the user request.",
  "- Do not simplify the request to a toy example (e.g. Alice/Bob) unless the user asked for that.",
];

function paramAtLeast(
  typeParams: DiagramFormatTypeParams,
  id: WizardParamId,
  label: string,
): string | undefined {
  const value = typeParams[id];
  if (value === undefined) {
    return undefined;
  }

  return `Include at least ${value} ${label}.`;
}

function buildTypeParamCompleteness(
  diagramType: WizardDiagramType,
  typeParams: DiagramFormatTypeParams,
): string[] {
  const lines: string[] = [];

  switch (diagramType) {
    case "sequence":
      lines.push(
        paramAtLeast(typeParams, "participants", "distinct participants") ?? "",
      );
      lines.push(
        "Include multiple messages between participants (sync/async, returns, notes when relevant).",
      );
      break;
    case "class":
      lines.push(
        paramAtLeast(typeParams, "classes", "classes with attributes and/or methods") ?? "",
      );
      lines.push("Include relationships (inheritance, association, dependency) between classes.");
      break;
    case "component":
      lines.push(
        paramAtLeast(typeParams, "components", "components or modules") ?? "",
      );
      lines.push("Include interfaces and dependency links between components.");
      break;
    case "activity":
      lines.push(paramAtLeast(typeParams, "lanes", "swimlanes or actors") ?? "");
      lines.push(paramAtLeast(typeParams, "steps", "activity steps") ?? "");
      lines.push("Cover the full process flow with branching (if/switch/fork) when the description implies it.");
      break;
    case "state":
      lines.push(
        paramAtLeast(typeParams, "states", "states with transitions") ?? "",
      );
      lines.push("Include entry/exit and meaningful transition labels.");
      break;
    case "c4_context":
      lines.push(paramAtLeast(typeParams, "actors", "actors (Person)") ?? "");
      lines.push(
        paramAtLeast(typeParams, "externalSystems", "external systems (System_Ext)") ?? "",
      );
      lines.push("Include the central system and Rel() links between all elements.");
      break;
    case "c4_container":
      lines.push(
        paramAtLeast(typeParams, "containers", "containers with technology labels") ?? "",
      );
      lines.push("Include relationships between containers and external actors/systems.");
      break;
    case "gantt":
      lines.push(paramAtLeast(typeParams, "tasks", "tasks with durations") ?? "");
      lines.push("Use sections/milestones when the description groups work.");
      break;
    case "mindmap":
      lines.push(paramAtLeast(typeParams, "nodes", "main branches (level 1)") ?? "");
      lines.push(
        paramAtLeast(typeParams, "steps", "sub-branches under EACH main branch (level 2+)") ?? "",
      );
      lines.push("Use the user's central topic as the root label, not a generic placeholder.");
      break;
    case "wbs":
      lines.push(paramAtLeast(typeParams, "nodes", "top-level work branches") ?? "");
      lines.push(paramAtLeast(typeParams, "steps", "sub-tasks under each branch") ?? "");
      break;
    case "er":
      lines.push(
        paramAtLeast(typeParams, "entities", "entities with attributes") ?? "",
      );
      lines.push("Include relationship notation and cardinalities where applicable.");
      break;
    case "graph":
    case "flowchart":
      lines.push(paramAtLeast(typeParams, "nodes", "nodes") ?? "");
      lines.push(paramAtLeast(typeParams, "edges", "directed edges or links") ?? "");
      break;
    case "pie":
      lines.push(paramAtLeast(typeParams, "nodes", "slices with numeric values") ?? "");
      break;
    case "journey":
    case "gitgraph":
    case "timeline":
    case "xychart":
    case "packet":
      lines.push(paramAtLeast(typeParams, "steps", "steps, events, or data points") ?? "");
      break;
    case "sankey":
      lines.push(paramAtLeast(typeParams, "nodes", "nodes in the flow") ?? "");
      lines.push(paramAtLeast(typeParams, "edges", "weighted flows between nodes") ?? "");
      break;
    case "block":
    case "requirement":
    case "quadrant":
    case "architecture":
    case "archimate":
      lines.push(paramAtLeast(typeParams, "nodes", "elements or items") ?? "");
      break;
    case "usecase":
      lines.push(paramAtLeast(typeParams, "actors", "actors") ?? "");
      lines.push(
        paramAtLeast(typeParams, "components", "use cases with actor associations") ?? "",
      );
      break;
    case "deployment":
      lines.push(paramAtLeast(typeParams, "nodes", "deployment nodes and artifacts") ?? "");
      break;
    case "object":
      lines.push(
        paramAtLeast(typeParams, "classes", "object instances with links") ?? "",
      );
      break;
    case "timing":
      lines.push(paramAtLeast(typeParams, "participants", "signals or participants") ?? "");
      lines.push(paramAtLeast(typeParams, "steps", "time states or transitions") ?? "");
      break;
    case "nwdiag":
      lines.push(paramAtLeast(typeParams, "nodes", "network nodes or servers") ?? "");
      lines.push(paramAtLeast(typeParams, "edges", "network connections") ?? "");
      break;
    default:
      break;
  }

  return lines.filter((line) => line.length > 0);
}

function buildPlantUmlSyntaxRules(diagramType: WizardDiagramType): string[] {
  switch (diagramType) {
    case "mindmap":
      return [
        "Format: PlantUML mindmap.",
        "Use @startmindmap and @endmindmap — do NOT use @startuml/@enduml.",
        "Hierarchy: * root, ** branch, *** sub-branch (add **** for deeper levels when needed).",
        "Optional layout: top to bottom direction or left to right direction.",
      ];
    case "gantt":
      return [
        "Format: PlantUML Gantt chart.",
        "Use @startgantt and @endgantt — do NOT use @startuml/@enduml.",
        "Define tasks with [Task name] lasts N days; group with sections when appropriate.",
      ];
    case "wbs":
      return [
        "Format: PlantUML WBS diagram.",
        "Use @startwbs and @endwbs — do NOT use @startuml/@enduml.",
        "Hierarchy with *, **, *** for work breakdown levels.",
      ];
    case "nwdiag":
      return [
        "Format: PlantUML nwdiag network diagram.",
        "Use @startnwdiag and @endnwdiag — do NOT use @startuml/@enduml.",
        "Define network blocks with addresses and connections.",
      ];
    case "er":
      return [
        "Format: PlantUML ER diagram with @startuml/@enduml.",
        "Use entity blocks with attributes and relationship notation (||--o{ etc.).",
      ];
    case "usecase":
      return [
        "Format: PlantUML use case diagram with @startuml/@enduml.",
        "Use actors, use cases in rectangles, associations, include/extend when relevant.",
      ];
    case "deployment":
      return [
        "Format: PlantUML deployment diagram with @startuml/@enduml.",
        "Use nodes, artifacts, databases, and deployment links.",
      ];
    case "object":
      return [
        "Format: PlantUML object diagram with @startuml/@enduml.",
        "Show object instances, fields, and links between instances.",
      ];
    case "timing":
      return [
        "Format: PlantUML timing diagram with @startuml/@enduml.",
        "Use concise/robust signals and @time markers; notes with note top of when needed.",
      ];
    case "archimate":
      return [
        "Format: PlantUML ArchiMate diagram with @startuml/@enduml.",
        "Use !include <archimate/Archimate> and ArchiMate element macros.",
      ];
    case "c4_context":
      return [
        "Format: PlantUML C4 Context diagram with @startuml/@enduml.",
        "Use !include ./plantuml-lib/C4/C4_Context.puml and Person/System/System_Ext/Rel elements.",
      ];
    case "c4_container":
      return [
        "Format: PlantUML C4 Container diagram with @startuml/@enduml.",
        "Use !include ./plantuml-lib/C4/C4_Container.puml and Container/Rel elements.",
      ];
    case "sequence":
      return [
        "Format: PlantUML sequence diagram with @startuml/@enduml.",
        "Declare participants/actors; use ->, -->, alt/else, loop, opt, par, notes as needed.",
      ];
    case "class":
      return [
        "Format: PlantUML class diagram with @startuml/@enduml.",
        "Define classes with attributes and methods; show relationships.",
      ];
    case "component":
      return [
        "Format: PlantUML component diagram with @startuml/@enduml.",
        "Use [Component] notation, interfaces, and dependency arrows.",
      ];
    case "activity":
      return [
        "Format: PlantUML activity diagram with @startuml/@enduml.",
        "Use swimlanes |lane|, :steps;, if/else, fork when the process requires them.",
      ];
    case "state":
      return [
        "Format: PlantUML state diagram with @startuml/@enduml.",
        "Use state aliases, [*] entry/exit, and labeled transitions.",
      ];
    default:
      return [
        "Format: PlantUML diagram with @startuml and @enduml.",
        "Use syntax appropriate to the requested diagram type.",
      ];
  }
}

function buildMermaidSyntaxRules(diagramType: WizardDiagramType): string[] {
  switch (diagramType) {
    case "mindmap":
      return [
        "Format: Mermaid mindmap.",
        "Start with the mindmap keyword.",
        "Use root((Central topic)) for the root; indent child branches consistently.",
        "Do not use flowchart or graph syntax.",
      ];
    case "gantt":
      return [
        "Format: Mermaid gantt with title, dateFormat, section blocks, and task definitions with durations.",
      ];
    case "sequence":
      return [
        "Format: Mermaid sequenceDiagram with participant declarations and message lines.",
        "Include activation, alt/opt/loop blocks when the scenario requires them.",
      ];
    case "class":
      return [
        "Format: Mermaid classDiagram with classes, members, and relationship arrows.",
      ];
    case "state":
      return [
        "Format: Mermaid stateDiagram-v2 with states, transitions, and notes if needed.",
      ];
    case "er":
      return [
        "Format: Mermaid erDiagram with entities, attributes, and relationship lines.",
      ];
    case "flowchart":
      return [
        "Format: Mermaid flowchart with node IDs, shapes, and directed edges.",
        "Include decision nodes and branches when the process requires them.",
      ];
    case "pie":
      return [
        "Format: Mermaid pie with showData, title, and slice labels with numeric values.",
      ];
    case "journey":
      return [
        "Format: Mermaid journey with title, section blocks, and task lines (action: score: actor).",
      ];
    case "gitgraph":
      return [
        "Format: Mermaid gitGraph with commit, branch, checkout, and merge statements.",
      ];
    case "timeline":
      return [
        "Format: Mermaid timeline with title and dated events in sections.",
      ];
    case "sankey":
      return [
        "Format: Mermaid sankey-beta with ASCII source,target,value CSV lines.",
        "Quote labels only when they contain commas.",
      ];
    case "xychart":
      return [
        "Format: Mermaid xychart-beta with title, x-axis, y-axis, and bar or line data series.",
      ];
    case "block":
      return [
        "Format: Mermaid block-beta with columns and block layout.",
      ];
    case "c4_context":
      return [
        "Format: Mermaid C4Context with Person, System, System_Ext, and Rel elements.",
      ];
    case "requirement":
      return [
        "Format: Mermaid requirementDiagram with requirement and element blocks and satisfies links.",
      ];
    case "quadrant":
      return [
        "Format: Mermaid quadrantChart with x-axis, y-axis, quadrant labels, and item coordinates.",
      ];
    case "architecture":
      return [
        "Format: Mermaid architecture-beta with group/service ids, bracket labels, and side links (e.g. a:R -- L:b).",
      ];
    case "packet":
      return [
        "Format: Mermaid packet-beta with title and bit-range field definitions.",
      ];
    case "activity":
    case "component":
      return [
        "Format: Mermaid flowchart with nodes and directed edges.",
        "Use meaningful node shapes for start/end/decisions when appropriate.",
      ];
    default:
      return [
        "Format: valid Mermaid diagram for the requested type.",
        "Start with the correct diagram-type keyword.",
      ];
  }
}

export function buildDiagramFormatRules(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
  typeParams: DiagramFormatTypeParams = {},
): string {
  const syntax =
    language === "mermaid"
      ? buildMermaidSyntaxRules(diagramType)
      : buildPlantUmlSyntaxRules(diagramType);

  const typeCompleteness = buildTypeParamCompleteness(diagramType, typeParams);

  return [
    ...syntax,
    "",
    ...SHARED_COMPLETENESS_RULES,
    ...typeCompleteness,
    "",
    ...SHARED_GUARDRAILS,
  ].join("\n");
}

export function getWizardDiagramFormatRules(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
  typeParams?: DiagramFormatTypeParams,
): string {
  return buildDiagramFormatRules(language, diagramType, typeParams ?? {});
}

export const LLM_WIZARD_ROLE_PROMPT =
  "Role: You are an expert information architect and diagram engineer. Task: produce complete, production-ready diagram source from structured requirements (RTCF: match Role, Task, Context from the user prompt, and the Format rules below).";

export const LLM_GENERATE_ROLE_PROMPT =
  "Role: You are an expert information architect and PlantUML diagram engineer. Task: produce a complete diagram that fully implements the user's request — not a minimal placeholder.";
