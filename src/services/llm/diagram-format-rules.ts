import type {
  WizardDiagramType,
  WizardLanguage,
  WizardParamId,
} from "@/constants/llm-wizard";

export type DiagramFormatTypeParams = Partial<Record<WizardParamId, number>>;

export type DiagramFormatPromptContext = {
  description?: string;
  additionalRequirements?: string;
};

const EXHAUSTIVE_COVERAGE_PATTERN =
  /(?:\bвсе\b|\bвсех\b|\bкажд\w*\b|\bполн\w*\b|по всем|целиком|\ball\b|\bevery\b|\bcomplete\b|\bfull\b|\bexhaustive\b|\bentire\b)/i;

const HIERARCHICAL_TAXONOMY_PATTERN =
  /район|district|направлен|direction|категор|групп|иерарх|hierarch|sub-?branch|подветк/i;

function combinePromptContextText(context?: DiagramFormatPromptContext): string {
  if (!context) {
    return "";
  }

  return [context.description, context.additionalRequirements]
    .filter((part) => part && part.trim().length > 0)
    .join("\n");
}

function detectsExhaustiveCoverage(text: string): boolean {
  return EXHAUSTIVE_COVERAGE_PATTERN.test(text);
}

function detectsHierarchicalTaxonomy(text: string): boolean {
  return HIERARCHICAL_TAXONOMY_PATTERN.test(text);
}

function buildExhaustiveCoverageRules(
  diagramType: WizardDiagramType,
  promptText: string,
): string[] {
  if (!detectsExhaustiveCoverage(promptText)) {
    return [];
  }

  const lines = [
    "Exhaustive coverage (critical — overrides numeric floors):",
    "- The user asked for ALL items in a set. Include EVERY matching entity from the description — never sample, abbreviate, or show only 2–4 examples per group.",
    "- Structural parameter minimums are floors only, NOT caps. Exceed them whenever the description lists or implies more items.",
  ];

  if (diagramType === "mindmap" || diagramType === "wbs") {
    lines.push(
      "- For geographic or administrative breakdowns: cover every direction/region branch, every city/settlement under its direction, and every district/sub-area when the user mentioned districts.",
      "- Omitting districts or listing only a few cities per direction is an incomplete response.",
    );
  }

  return lines;
}

function buildHierarchicalTaxonomyRules(
  diagramType: WizardDiagramType,
  promptText: string,
): string[] {
  if (!detectsHierarchicalTaxonomy(promptText)) {
    return [];
  }

  if (diagramType === "mindmap") {
    return [
      "Hierarchy depth (critical):",
      "- Map each organizational level to a deeper mindmap level (* root, ** direction/category, *** city/item, **** district/sub-item when districts are requested).",
      "- Do not flatten districts into city labels or skip intermediate levels the user asked for.",
    ];
  }

  if (diagramType === "wbs") {
    return [
      "Hierarchy depth (critical):",
      "- Reflect every requested breakdown level in the WBS tree; do not collapse child groups into parent labels.",
    ];
  }

  return [];
}

const SHARED_COMPLETENESS_RULES = [
  "Completeness (critical):",
  "- Build a FULL diagram from the user's Description and Additional requirements — not a minimal valid sketch.",
  "- Include EVERY named entity, step, actor, branch, or concept from the user text; do not abbreviate or omit details to save space.",
  "- Numeric structural minimums are floors, not targets or maximums — include more items when the description requires it.",
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

  return `Minimum floor: ${value} ${label} — exceed when the description lists or implies more.`;
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
      lines.push(
        "For direction → city → district trees: ** = direction, *** = city, **** = district (add ***** only when needed).",
      );
      lines.push(
        "Every main branch that the user named must have its full child list — not a partial sample.",
      );
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
        "A clock signal is clock \"Label\" as alias with period 50.",
      ];
    case "archimate":
      return [
        "Format: PlantUML ArchiMate diagram with @startuml/@enduml.",
        "Use !include <archimate/Archimate> and ArchiMate element macros.",
        "Relationships are Rel_Triggering, Rel_Flow, Rel_Serving, Rel_Assignment, or Rel_Access.",
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
        "Quote labels only when they contain commas or quotes. Double an inner quote.",
        "When the user asks for appearance options, put them in a YAML frontmatter config.sankey block before sankey-beta: showValues, prefix, suffix, linkColor (source, target, gradient, or a CSS color), nodeAlignment (justify, left, right, center), width, height, useMaxWidth, nodeWidth, nodePadding, labelStyle (legacy or outlined), nodeColors. Do not put those keys on CSV rows.",
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

function buildD2SyntaxRules(diagramType: WizardDiagramType): string[] {
  const shape =
    diagramType === "class"
      ? "Use shape: class on class blocks and -> for relationships."
      : diagramType === "er"
        ? "Use shape: sql_table and connect primary keys to foreign keys."
        : diagramType === "sequence"
          ? "Wrap participants in a block with shape: sequence_diagram."
          : diagramType === "architecture"
            ? "Group services in a container and use cylinder or hexagon shapes where they help."
            : "Connect steps with -> and set direction: right or direction: down.";

  return [
    "Format: D2 diagram source.",
    "Do not wrap the source in Markdown fences or PlantUML @start/@end tags.",
    shape,
  ];
}

function buildStructurizrSyntaxRules(diagramType: WizardDiagramType): string[] {
  const view =
    diagramType === "c4_container"
      ? "Add a container view with include * and autolayout."
      : diagramType === "component"
        ? "Declare components inside a container and add a component view."
        : diagramType === "deployment"
          ? "Declare a deploymentEnvironment with deploymentNode and containerInstance, plus a deployment view."
          : "Add people and software systems, then a systemContext view with include *.";

  return [
    "Format: Structurizr DSL.",
    "Return one workspace { model { } views { } } document.",
    "Do not emit PlantUML or Mermaid.",
    view,
  ];
}

function buildWiremarkSyntaxRules(): string[] {
  return [
    "Format: WireMark wireframe.",
    "Start with a Wireframe declaration, then a Stack of quoted Typography, TextField, and Button lines.",
    "Quote every visible label. Do not emit PlantUML or Mermaid.",
  ];
}

function buildGraphmlSyntaxRules(): string[] {
  return [
    "Format: GraphML XML.",
    "Return a graphml document with a graph element, node ids, and edge source/target attributes.",
    "Do not emit PlantUML or Mermaid.",
  ];
}

function buildSyntaxRules(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
): string[] {
  switch (language) {
    case "mermaid":
      return buildMermaidSyntaxRules(diagramType);
    case "d2":
      return buildD2SyntaxRules(diagramType);
    case "structurizr":
      return buildStructurizrSyntaxRules(diagramType);
    case "wiremark":
      return buildWiremarkSyntaxRules();
    case "graphml":
      return buildGraphmlSyntaxRules();
    case "plantuml":
      return buildPlantUmlSyntaxRules(diagramType);
    default:
      return buildPlantUmlSyntaxRules(diagramType);
  }
}

function detectMermaidExtPromptRules(promptText: string): string[] | null {
  if (/\b(?:box\s*plot|boxplot|ящик\s+с\s+усами)\b/i.test(promptText)) {
    return [
      "Format: Mermaid Ext boxplot.",
      "Start with keyword `boxplot` on the first line, optional `title ...`, `y \"label\" min --> max`, `grid`, and `colors outlier=#hex s1=#hex ...`.",
      "Each category row is `<Category> : min=<n>, q1=<n>, median=<n>, q3=<n>, max=<n> [, mean=<n>] [, outliers=<n1;n2>] [, color=#hex]` or `<Category> : values=<v1>, <v2>, ...`.",
    ];
  }
  if (/\b(?:tree\s*map|treemap|древовидн\w+\s+карт)\b/i.test(promptText)) {
    return [
      "Format: Mermaid Ext treemap.",
      "Start with keyword `treemap` on the first line, optional `title ...`, `labels both|values|percent|none`, and `colors s1=#hex s2=#hex ...`.",
      "Each item row is `<Group> / <Item> : <positive_weight> [color=#hex]`.",
    ];
  }
  if (/\b(?:radar|spider|лепестков\w+\s+диаграмм)\b/i.test(promptText)) {
    return [
      "Format: Mermaid Ext radar chart.",
      "Start with keyword `radar`, then `axes <Axis 1>, <Axis 2>, <Axis 3>, ...` (at least 3 axes), optional `scale 0 --> 100`, `rings 5`, `fill 0.22`, and `colors s1=#hex s2=#hex ...`.",
      "Each series row is `series <Name> : <v1>, <v2>, ... [color=#hex]` with one number per axis.",
    ];
  }
  if (/\b(?:voronoi|вороного)\b/i.test(promptText)) {
    return [
      "Format: Mermaid Ext voronoi diagram.",
      "Start with keyword `voronoi`, optional `title ...`, `x \"label\" 0 --> 100`, `y \"label\" 0 --> 100`, `colors s1=#hex ...`, then `data`.",
      "Each site row is `<Label> : x=<num>, y=<num> [, group=<name>] [, color=#hex]`.",
    ];
  }
  if (/\b(?:clustered|series\s+chart|кластеризованн\w+\s+диаграмм|серийн\w+\s+диаграмм)\b/i.test(promptText)) {
    const rotate = /90|поворот|rotat|horizontal/i.test(promptText);
    return [
      "Format: Mermaid Ext series chart (grouped bars).",
      "The opening keyword is `series` only. Do not emit `clustered`.",
      `Start with keyword \`series\`,${rotate ? " include `rotate 90` for 90-degree horizontal orientation," : ""} \`categories <C1>, <C2>, ...\`, optional \`y "label" min --> max\`, \`grid\`, and \`colors s1=#hex s2=#hex ...\`.`,
      "Each bar series is `series <Name> : <v1>, <v2>, ... [color=#hex]` matching the number of categories. An empty slot, `-`, or `null` skips that category.",
      "A line is `line <Label> : <v1>, <v2>, ... [color=#hex] [style=solid|dash|dot|dashdot] [width=N]`. The label is drawn to the right of the plot. A skipped slot does not break the line: connect the point before the gap to the point after it.",
      "CAGR arrows: `cagr` (first to last bar of the preceding series, or the first series if it comes first), `cagr <bar1>, <bar2>`, optional `format=\"0.0%\"`, `prefix=\"CAGR: \"` (prepended to the percent) or `label=\"...\"` (oval text as-is). Consecutive `cagr` lines apply to the same series.",
    ];
  }
  return null;
}

export function buildDiagramFormatRules(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
  typeParams: DiagramFormatTypeParams = {},
  promptContext?: DiagramFormatPromptContext,
): string {
  const promptText = combinePromptContextText(promptContext);
  const extSyntax =
    language === "mermaid" ? detectMermaidExtPromptRules(promptText) : null;
  const syntax = extSyntax ?? buildSyntaxRules(language, diagramType);

  const typeCompleteness = buildTypeParamCompleteness(diagramType, typeParams);
  const exhaustiveRules = buildExhaustiveCoverageRules(diagramType, promptText);
  const taxonomyRules = buildHierarchicalTaxonomyRules(diagramType, promptText);

  return [
    ...syntax,
    "",
    ...SHARED_COMPLETENESS_RULES,
    ...typeCompleteness,
    ...(exhaustiveRules.length > 0 ? ["", ...exhaustiveRules] : []),
    ...(taxonomyRules.length > 0 ? ["", ...taxonomyRules] : []),
    "",
    ...SHARED_GUARDRAILS,
  ].join("\n");
}

export function getWizardDiagramFormatRules(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
  typeParams?: DiagramFormatTypeParams,
  promptContext?: DiagramFormatPromptContext,
): string {
  return buildDiagramFormatRules(
    language,
    diagramType,
    typeParams ?? {},
    promptContext,
  );
}

export const LLM_WIZARD_ROLE_PROMPT =
  "Role: You are an expert information architect and diagram engineer. Task: produce complete, production-ready diagram source from structured requirements (RTCF: match Role, Task, Context from the user prompt, and the Format rules below).";

export const LLM_GENERATE_ROLE_PROMPT =
  "Role: You are an expert information architect and PlantUML diagram engineer. Task: produce a complete diagram that fully implements the user's request — not a minimal placeholder.";
