/**
 * Diagram languages the site editor can open, and the wizard types each one
 * accepts. The MCP server and the in-app wizard both read this table.
 */

export const AGENT_DIAGRAM_LANGUAGES = [
  "plantuml",
  "mermaid",
  "graphml",
  "wiremark",
  "d2",
  "structurizr",
] as const;

export type AgentDiagramLanguage = (typeof AGENT_DIAGRAM_LANGUAGES)[number];

export const AGENT_DIAGRAM_TYPES = [
  "sequence",
  "class",
  "component",
  "activity",
  "state",
  "c4_context",
  "c4_container",
  "gantt",
  "mindmap",
  "er",
  "graph",
  "flowchart",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
  "usecase",
  "deployment",
  "object",
  "timing",
  "wbs",
  "nwdiag",
  "archimate",
  "wireframe",
] as const;

export type AgentDiagramType = (typeof AGENT_DIAGRAM_TYPES)[number];

export const AGENT_DIAGRAM_DIRECTIONS = ["TB", "LR"] as const;

export type AgentDiagramDirection = (typeof AGENT_DIAGRAM_DIRECTIONS)[number];

export type AgentDiagramLocale = "ru" | "en";

const DEFAULT_SCAFFOLD_COUNT = 3;
const MIN_SCAFFOLD_COUNT = 1;
const MAX_SCAFFOLD_COUNT = 8;

export const AGENT_TYPES_BY_LANGUAGE: Record<
  AgentDiagramLanguage,
  readonly AgentDiagramType[]
> = {
  plantuml: [
    "sequence",
    "class",
    "component",
    "activity",
    "state",
    "c4_context",
    "c4_container",
    "gantt",
    "mindmap",
    "er",
    "usecase",
    "deployment",
    "object",
    "timing",
    "wbs",
    "nwdiag",
    "archimate",
  ],
  mermaid: [
    "sequence",
    "class",
    "component",
    "activity",
    "state",
    "gantt",
    "mindmap",
    "er",
    "flowchart",
    "pie",
    "journey",
    "gitgraph",
    "timeline",
    "sankey",
    "xychart",
    "block",
    "c4_context",
    "requirement",
    "quadrant",
    "architecture",
    "packet",
  ],
  graphml: ["graph"],
  wiremark: ["wireframe"],
  d2: ["flowchart", "sequence", "class", "er", "architecture"],
  structurizr: ["c4_context", "c4_container", "component", "deployment"],
};

const FILE_NAMES: Record<AgentDiagramLanguage, string> = {
  plantuml: "diagram.puml",
  mermaid: "diagram.mmd",
  graphml: "diagram.graphml",
  wiremark: "diagram.wiremark",
  d2: "diagram.d2",
  structurizr: "diagram.dsl",
};

const FORMAT_LABELS: Record<AgentDiagramLanguage, string> = {
  plantuml: "PlantUML",
  mermaid: "Mermaid",
  graphml: "GraphML",
  wiremark: "WireMark",
  d2: "D2",
  structurizr: "Structurizr DSL",
};

const FORMAT_PATTERNS: ReadonlyArray<{
  format: AgentDiagramLanguage;
  pattern: RegExp;
}> = [
  { format: "structurizr", pattern: /structurizr|\.dsl\b|workspace\s*\{/i },
  { format: "d2", pattern: /\bd2\b|d2lang/i },
  {
    format: "wiremark",
    pattern: /wiremark|wireframe|вайрфрейм|макет(?:\s+экрана|\s+интерфейса)?/i,
  },
  { format: "graphml", pattern: /graphml|\byed\b|gephi/i },
  { format: "mermaid", pattern: /\bmermaid\b/i },
  { format: "plantuml", pattern: /plantuml|\.puml\b/i },
];

const TYPE_PATTERNS: ReadonlyArray<{
  type: AgentDiagramType;
  pattern: RegExp;
}> = [
  { type: "c4_container", pattern: /c4[\s-]*container|контейнер/i },
  { type: "c4_context", pattern: /c4[\s-]*context|системн\w*\s+контекст|\bc4\b/i },
  { type: "gitgraph", pattern: /git\s*graph|gitgraph|коммит/i },
  { type: "pie", pattern: /\bpie\b|кругов/i },
  { type: "sankey", pattern: /sankey|санке/i },
  { type: "journey", pattern: /user journey|journey|пользовательск\w+\s+пут/i },
  { type: "quadrant", pattern: /quadrant|квадрант/i },
  { type: "xychart", pattern: /xy\s*chart|xychart/i },
  { type: "timeline", pattern: /timeline|хронолог|временн\w+\s+шкал/i },
  { type: "gantt", pattern: /gantt|ган[тг]/i },
  { type: "mindmap", pattern: /mind\s*map|mindmap|интеллект-карт|ментальн/i },
  { type: "wireframe", pattern: /wireframe|вайрфрейм|макет/i },
  { type: "sequence", pattern: /sequence|последовательност/i },
  { type: "class", pattern: /class diagram|диаграмм\w*\s+класс|классов/i },
  { type: "er", pattern: /\ber\b|entity.relationship|sql\s*table|сущност/i },
  { type: "deployment", pattern: /deployment|разв[её]рт/i },
  { type: "component", pattern: /component|компонент/i },
  { type: "architecture", pattern: /architecture|архитектур/i },
  { type: "flowchart", pattern: /flowchart|flow chart|блок-схем/i },
  { type: "state", pattern: /state diagram|диаграмм\w*\s+состоя|состояни/i },
  { type: "activity", pattern: /activity|деятельност|процесс/i },
  { type: "usecase", pattern: /use\s*case|вариант\w*\s+использован/i },
  { type: "nwdiag", pattern: /nwdiag|сетев\w+\s+тополог/i },
  { type: "archimate", pattern: /archimate/i },
  { type: "wbs", pattern: /\bwbs\b|work breakdown|иерарх\w+\s+работ/i },
  { type: "timing", pattern: /timing|временн\w+\s+диаграм/i },
  { type: "object", pattern: /object diagram|диаграмм\w*\s+объект/i },
  { type: "requirement", pattern: /requirement|требован/i },
  { type: "packet", pattern: /\bpacket\b|пакет/i },
  { type: "graph", pattern: /\bgraphml\b|\bgraph\b|граф/i },
];

export interface DiagramFormatInfo {
  format: AgentDiagramLanguage;
  label: string;
  fileName: string;
  diagramTypes: readonly AgentDiagramType[];
}

export interface DiagramPlan {
  format: AgentDiagramLanguage;
  diagramType: AgentDiagramType;
  label: string;
  fileName: string;
  reason: string;
  warnings: string[];
}

export interface DiagramScaffold {
  format: AgentDiagramLanguage;
  diagramType: AgentDiagramType;
  source: string;
  fileName: string;
  warnings: string[];
}

export function isAgentDiagramLanguage(
  value: string,
): value is AgentDiagramLanguage {
  return (AGENT_DIAGRAM_LANGUAGES as readonly string[]).includes(value);
}

export function isAgentDiagramType(value: string): value is AgentDiagramType {
  return (AGENT_DIAGRAM_TYPES as readonly string[]).includes(value);
}

export function listDiagramFormats(): DiagramFormatInfo[] {
  return AGENT_DIAGRAM_LANGUAGES.map((format) => ({
    format,
    label: FORMAT_LABELS[format],
    fileName: FILE_NAMES[format],
    diagramTypes: AGENT_TYPES_BY_LANGUAGE[format],
  }));
}

export function diagramFormatLabel(format: AgentDiagramLanguage): string {
  return FORMAT_LABELS[format];
}

export function diagramFileName(format: AgentDiagramLanguage): string {
  return FILE_NAMES[format];
}

function languagesForType(type: AgentDiagramType): AgentDiagramLanguage[] {
  return AGENT_DIAGRAM_LANGUAGES.filter((format) =>
    AGENT_TYPES_BY_LANGUAGE[format].includes(type),
  );
}

function clampCount(count: number | undefined): number {
  if (count === undefined || !Number.isFinite(count)) {
    return DEFAULT_SCAFFOLD_COUNT;
  }

  return Math.min(
    MAX_SCAFFOLD_COUNT,
    Math.max(MIN_SCAFFOLD_COUNT, Math.round(count)),
  );
}

function detectExplicitFormat(request: string): AgentDiagramLanguage | null {
  for (const candidate of FORMAT_PATTERNS) {
    if (candidate.pattern.test(request)) {
      return candidate.format;
    }
  }

  return null;
}

function detectDiagramType(request: string): AgentDiagramType | null {
  for (const candidate of TYPE_PATTERNS) {
    if (candidate.pattern.test(request)) {
      return candidate.type;
    }
  }

  return null;
}

function defaultType(format: AgentDiagramLanguage): AgentDiagramType {
  return AGENT_TYPES_BY_LANGUAGE[format][0];
}

export function planDiagram(input: {
  request: string;
  format?: string;
  diagramType?: string;
}): DiagramPlan {
  const request = input.request.trim();
  const warnings: string[] = [];
  const explicitArgument = input.format && isAgentDiagramLanguage(input.format)
    ? input.format
    : null;
  const explicitText = detectExplicitFormat(request);
  const requestedType =
    input.diagramType && isAgentDiagramType(input.diagramType)
      ? input.diagramType
      : detectDiagramType(request);

  let format: AgentDiagramLanguage =
    explicitArgument ?? explicitText ?? "plantuml";
  let diagramType = requestedType ?? defaultType(format);
  let reason = explicitArgument
    ? `Format ${format} was requested.`
    : explicitText
      ? `The request names ${FORMAT_LABELS[format]}.`
      : `${FORMAT_LABELS[format]} is the default when the request does not name a language.`;

  const owners = languagesForType(diagramType);
  if (!owners.includes(format)) {
    if (explicitArgument || explicitText) {
      const fallback = defaultType(format);
      warnings.push(
        `${diagramType} is not available in ${format}; using ${fallback}.`,
      );
      diagramType = fallback;
    } else if (owners.length > 0) {
      format = owners[0];
      reason = `${diagramType} is expressed in ${FORMAT_LABELS[format]}.`;
    }
  } else if (!explicitArgument && !explicitText && owners.length > 1) {
    format = owners[0];
    reason = `${diagramType} is available in several languages; ${FORMAT_LABELS[format]} is the default.`;
  } else if (requestedType) {
    reason = `${reason} Type ${diagramType} matches the request.`;
  }

  if (!request) {
    warnings.push("Empty request. Returning the default diagram for the format.");
  }

  return {
    format,
    diagramType,
    label: FORMAT_LABELS[format],
    fileName: FILE_NAMES[format],
    reason,
    warnings,
  };
}

function autolayout(direction: AgentDiagramDirection): "lr" | "tb" {
  return direction === "LR" ? "lr" : "tb";
}

function d2Direction(direction: AgentDiagramDirection): "right" | "down" {
  return direction === "LR" ? "right" : "down";
}

function scaffoldD2(
  diagramType: AgentDiagramType,
  locale: AgentDiagramLocale,
  direction: AgentDiagramDirection,
  count: number,
): string {
  const flow = d2Direction(direction);
  const user = locale === "ru" ? "Пользователь" : "User";
  const api = locale === "ru" ? "API" : "API";
  const database = locale === "ru" ? "База" : "Database";

  if (diagramType === "sequence") {
    return [
      `direction: ${flow}`,
      "",
      "checkout: {",
      "  shape: sequence_diagram",
      `  buyer: "${user}"`,
      `  shop: "${locale === "ru" ? "Магазин" : "Shop"}"`,
      `  buyer -> shop: "${locale === "ru" ? "Заказ" : "Order"}"`,
      "}",
    ].join("\n");
  }

  if (diagramType === "class") {
    return [
      `direction: ${flow}`,
      "",
      `User: "${user}" {`,
      "  shape: class",
      "  +id: int",
      "  +name: string",
      "}",
      "",
      `Order: "${locale === "ru" ? "Заказ" : "Order"}" {`,
      "  shape: class",
      "  +id: int",
      "}",
      "",
      `User -> Order: "${locale === "ru" ? "оформляет" : "places"}"`,
    ].join("\n");
  }

  if (diagramType === "er") {
    return [
      `direction: ${flow}`,
      "",
      "users: users {",
      "  shape: sql_table",
      "  id: int {constraint: primary_key}",
      "  name: string",
      "}",
      "",
      "orders: orders {",
      "  shape: sql_table",
      "  id: int {constraint: primary_key}",
      "  user_id: int {constraint: foreign_key}",
      "}",
      "",
      "users.id -> orders.user_id",
    ].join("\n");
  }

  if (diagramType === "architecture") {
    return [
      `direction: ${flow}`,
      "",
      "network: {",
      `  web: "${locale === "ru" ? "Веб" : "Web"}"`,
      `  api: "${api}" {`,
      "    shape: hexagon",
      "  }",
      `  db: "${database}" {`,
      "    shape: cylinder",
      "  }",
      "}",
      "",
      "network.web -> network.api",
      "network.api -> network.db",
    ].join("\n");
  }

  const lines = [`direction: ${flow}`, ""];
  for (let index = 1; index <= count; index += 1) {
    const label = locale === "ru" ? `Шаг ${index}` : `Step ${index}`;
    lines.push(`step${index}: "${label}"`);
  }
  lines.push("");
  for (let index = 1; index < count; index += 1) {
    lines.push(`step${index} -> step${index + 1}`);
  }
  return lines.join("\n");
}

function scaffoldStructurizr(
  diagramType: AgentDiagramType,
  locale: AgentDiagramLocale,
  direction: AgentDiagramDirection,
  count: number,
): string {
  const layout = autolayout(direction);
  const customer = locale === "ru" ? "Покупатель" : "Customer";
  const shop = locale === "ru" ? "Магазин" : "Shop";
  const mail = locale === "ru" ? "Почта" : "Mail";

  if (diagramType === "c4_container") {
    return [
      `workspace "${shop}" "Containers" {`,
      "    model {",
      `        customer = person "${customer}" "Places orders."`,
      `        shop = softwareSystem "${shop}" "Online shop." {`,
      `            web = container "Web" "Customer interface." "React"`,
      `            api = container "API" "Orders and catalog." "Java"`,
      `            db = container "Database" "Orders and products." "PostgreSQL" {`,
      `                tags "Database"`,
      "            }",
      "        }",
      `        customer -> web "Opens the site" "HTTPS"`,
      `        web -> api "Calls" "JSON/HTTPS"`,
      `        api -> db "Reads and writes" "JDBC"`,
      "    }",
      "    views {",
      `        container shop "Containers" {`,
      "            include *",
      `            autolayout ${layout}`,
      "        }",
      "    }",
      "}",
    ].join("\n");
  }

  if (diagramType === "component") {
    const components = Math.max(2, Math.min(count, MAX_SCAFFOLD_COUNT));
    const lines = [
      `workspace "${shop}" "Components" {`,
      "    model {",
      `        shop = softwareSystem "${shop}" "Online shop." {`,
      `            api = container "API" "Order service." "Java" {`,
    ];
    for (let index = 1; index <= components; index += 1) {
      const name = locale === "ru" ? `Компонент ${index}` : `Component ${index}`;
      lines.push(
        `                part${index} = component "${name}" "Handles part ${index}." "Spring Bean"`,
      );
    }
    for (let index = 1; index < components; index += 1) {
      lines.push(`                part${index} -> part${index + 1} "Calls"`);
    }
    lines.push(
      "            }",
      "        }",
      "    }",
      "    views {",
      `        component api "Components" {`,
      "            include *",
      `            autolayout ${layout}`,
      "        }",
      "    }",
      "}",
    );
    return lines.join("\n");
  }

  if (diagramType === "deployment") {
    return [
      `workspace "${shop}" "Deployment" {`,
      "    model {",
      `        shop = softwareSystem "${shop}" "Online shop." {`,
      `            web = container "Web" "Customer interface." "React"`,
      `            db = container "Database" "Stores orders." "PostgreSQL" {`,
      `                tags "Database"`,
      "            }",
      "        }",
      `        live = deploymentEnvironment "Production" {`,
      `            cluster = deploymentNode "Cluster" "Kubernetes cluster." "Kubernetes" {`,
      "                containerInstance web",
      `                dbNode = deploymentNode "Database" "PostgreSQL node." "VM" {`,
      "                    containerInstance db",
      "                }",
      "            }",
      "        }",
      "    }",
      "    views {",
      `        deployment shop live "Deployment" {`,
      "            include *",
      `            autolayout ${layout}`,
      "        }",
      "    }",
      "}",
    ].join("\n");
  }

  const systems = Math.max(2, Math.min(count, MAX_SCAFFOLD_COUNT));
  const lines = [
    `workspace "${shop}" "Context" {`,
    "    model {",
    `        customer = person "${customer}" "Places orders."`,
    `        shop = softwareSystem "${shop}" "Handles orders."`,
    `        mail = softwareSystem "${mail}" "Sends messages."`,
    `        customer -> shop "Places an order"`,
    `        shop -> mail "Sends a message"`,
  ];
  for (let index = 3; index <= systems; index += 1) {
    lines.push(
      `        ext${index} = softwareSystem "External ${index}" "Outside system."`,
    );
    lines.push(`        shop -> ext${index} "Uses"`);
  }
  lines.push(
    "    }",
    "    views {",
    `        systemContext shop "Context" {`,
    "            include *",
    `            autolayout ${layout}`,
    "        }",
    "    }",
    "}",
  );
  return lines.join("\n");
}

function scaffoldWiremark(
  locale: AgentDiagramLocale,
  count: number,
): string {
  const title = locale === "ru" ? "Экран" : "Screen";
  const action = locale === "ru" ? "Дальше" : "Continue";
  const lines = [
    "Wireframe #screen mobile",
    "  Stack column gap=2",
    `    Typography h4 "${title}"`,
  ];
  for (let index = 1; index <= count; index += 1) {
    const label = locale === "ru" ? `Поле ${index}` : `Field ${index}`;
    lines.push(`    TextField "${label}"`);
  }
  lines.push(`    Button "${action}" contained`);
  return lines.join("\n");
}

function scaffoldGraphml(direction: AgentDiagramDirection, count: number): string {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">`,
    `  <graph edgedefault="directed" rankdir="${direction}">`,
  ];
  for (let index = 1; index <= count; index += 1) {
    lines.push(`    <node id="n${index}"/>`);
  }
  for (let index = 1; index < count; index += 1) {
    lines.push(`    <edge source="n${index}" target="n${index + 1}"/>`);
  }
  lines.push("  </graph>", "</graphml>");
  return lines.join("\n");
}

function scaffoldMermaid(
  diagramType: AgentDiagramType,
  direction: AgentDiagramDirection,
): string {
  const flow = direction === "LR" ? "LR" : "TB";
  switch (diagramType) {
    case "sequence":
      return "sequenceDiagram\n  Alice->>Bob: Hello";
    case "class":
      return "classDiagram\n  class User {\n    +id int\n    +name()\n  }";
    case "state":
      return "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active";
    case "er":
      return "erDiagram\n  USER ||--o{ ORDER : places";
    case "gantt":
      return "gantt\n  title Plan\n  section Work\n  Task :a1, 2026-01-01, 3d";
    case "mindmap":
      return "mindmap\n  root((Topic))\n    Branch";
    case "pie":
      return "pie\n  title Shares\n  \"A\" : 40\n  \"B\" : 60";
    case "journey":
      return "journey\n  title Day\n  section Use\n    Open: 5: User";
    case "gitgraph":
      return "gitGraph\n  commit\n  branch feature\n  checkout feature\n  commit\n  checkout main\n  merge feature";
    case "timeline":
      return "timeline\n  title History\n  2024 : Start\n  2026 : Now";
    case "c4_context":
      return "C4Context\n  Person(user, \"User\")\n  System(app, \"App\")\n  Rel(user, app, \"Uses\")";
    case "architecture":
      return "architecture-beta\n  group cloud(cloud)[Cloud]\n  service api(server)[API] in cloud";
    default:
      return `flowchart ${flow}\n  start([Start]) --> step[Step] --> finish([End])`;
  }
}

function scaffoldPlantUml(
  diagramType: AgentDiagramType,
  direction: AgentDiagramDirection,
): string {
  const flow = direction === "LR" ? "left to right direction" : "top to bottom direction";
  switch (diagramType) {
    case "mindmap":
      return `@startmindmap\n${flow}\n* Topic\n** Branch\n@endmindmap`;
    case "gantt":
      return "@startgantt\n[Task] lasts 3 days\n@endgantt";
    case "wbs":
      return "@startwbs\n* Project\n** Work\n@endwbs";
    case "nwdiag":
      return "@startnwdiag\nnetwork {\n  web [address = 192.168.0.1]\n  db [address = 192.168.0.2]\n}\n@endnwdiag";
    case "sequence":
      return "@startuml\nAlice -> Bob : Hello\n@enduml";
    case "class":
      return "@startuml\nclass User {\n  id\n}\nclass Order\nUser --> Order\n@enduml";
    default:
      return `@startuml\n${flow}\nstart\n:Step;\nstop\n@enduml`;
  }
}

export function scaffoldDiagram(input: {
  format: AgentDiagramLanguage;
  diagramType?: AgentDiagramType;
  locale?: AgentDiagramLocale;
  direction?: AgentDiagramDirection;
  count?: number;
}): DiagramScaffold {
  const warnings: string[] = [];
  const format = input.format;
  const allowed = AGENT_TYPES_BY_LANGUAGE[format];
  let diagramType = input.diagramType ?? allowed[0];
  if (!allowed.includes(diagramType)) {
    warnings.push(
      `${diagramType} is not available in ${format}; using ${allowed[0]}.`,
    );
    diagramType = allowed[0];
  }

  const locale = input.locale ?? "en";
  const direction = input.direction ?? "TB";
  const count = clampCount(input.count);
  let source: string;

  switch (format) {
    case "d2":
      source = scaffoldD2(diagramType, locale, direction, count);
      break;
    case "structurizr":
      source = scaffoldStructurizr(diagramType, locale, direction, count);
      break;
    case "wiremark":
      source = scaffoldWiremark(locale, count);
      break;
    case "graphml":
      source = scaffoldGraphml(direction, count);
      break;
    case "mermaid":
      source = scaffoldMermaid(diagramType, direction);
      break;
    case "plantuml":
      source = scaffoldPlantUml(diagramType, direction);
      break;
    default:
      source = "";
  }

  return {
    format,
    diagramType,
    source,
    fileName: FILE_NAMES[format],
    warnings,
  };
}

export function generateDiagramScaffold(input: {
  request: string;
  format?: string;
  diagramType?: string;
  locale?: AgentDiagramLocale;
  direction?: AgentDiagramDirection;
  count?: number;
}): { plan: DiagramPlan; scaffold: DiagramScaffold } {
  const plan = planDiagram(input);
  const scaffold = scaffoldDiagram({
    format: plan.format,
    diagramType: plan.diagramType,
    locale: input.locale,
    direction: input.direction,
    count: input.count,
  });
  return {
    plan,
    scaffold: {
      ...scaffold,
      warnings: [...plan.warnings, ...scaffold.warnings],
    },
  };
}
