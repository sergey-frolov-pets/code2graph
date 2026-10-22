import type { AppLocale } from "@/constants/i18n";
import type { SampleCatalog } from "@/languages/sample-catalog";

export const GRAPHML_SAMPLE_IDS = [
  "flow",
  "decision",
  "architecture",
  "states",
  "network",
] as const;

export type GraphmlSampleId = (typeof GRAPHML_SAMPLE_IDS)[number];

const GRAPHML_NAMESPACE = "http://graphml.graphdrawing.org/xmlns";

const GRAPHML_KEYS = `  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>`;

const GRAPH_PALETTE = {
  blueFill: "#dbeafe",
  blue: "#2563eb",
  greenFill: "#dcfce7",
  green: "#15803d",
  amberFill: "#fef3c7",
  amber: "#d97706",
  redFill: "#fee2e2",
  red: "#dc2626",
  violetFill: "#ede9fe",
  violet: "#7c3aed",
  slateFill: "#f1f5f9",
  slate: "#64748b",
  orangeFill: "#ffedd5",
  orange: "#ea580c",
  skyFill: "#e0f2fe",
  sky: "#0284c7",
} as const;

type GraphmlNodeShape = "rectangle" | "ellipse" | "diamond" | "hexagon";
type GraphmlRankDirection = "TB" | "LR" | "BT" | "RL";

interface GraphmlSampleParts {
  description: string;
  edgedefault: "directed" | "undirected";
  rankdir?: GraphmlRankDirection;
  body: string;
}

interface GraphmlEdgeOptions {
  label?: string;
  color?: string;
  dashed?: boolean;
  directed?: boolean;
}

function buildGraphmlSample(parts: GraphmlSampleParts): string {
  const rankdir = parts.rankdir ? ` rankdir="${parts.rankdir}"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="${GRAPHML_NAMESPACE}">
${GRAPHML_KEYS}
  <desc>${parts.description}</desc>
  <graph edgedefault="${parts.edgedefault}"${rankdir}>
${parts.body}
  </graph>
</graphml>`;
}

function graphNode(
  id: string,
  label: string,
  shape: GraphmlNodeShape,
  fill: string,
  stroke: string,
): string {
  return `    <node id="${id}">
      <data key="shape">${shape}</data>
      <data key="fill">${fill}</data>
      <data key="stroke">${stroke}</data>
      <data key="label">${label}</data>
    </node>`;
}

function graphEdge(
  source: string,
  target: string,
  options: GraphmlEdgeOptions = {},
): string {
  const directed =
    options.directed === undefined
      ? ""
      : ` directed="${options.directed ? "true" : "false"}"`;
  const lines = [`    <edge source="${source}" target="${target}"${directed}>`];
  if (options.dashed) {
    lines.push('      <data key="style">dashed</data>');
  }
  if (options.color) {
    lines.push(`      <data key="color">${options.color}</data>`);
  }
  if (options.label) {
    lines.push(`      <data key="edgeLabel">${options.label}</data>`);
  }
  lines.push("    </edge>");
  return lines.join("\n");
}

interface GraphmlSampleCopy {
  flowDescription: string;
  user: string;
  database: string;
  request: string;
  read: string;
  rows: string;
  response: string;
  decisionDescription: string;
  start: string;
  check: string;
  done: string;
  retryNode: string;
  yes: string;
  no: string;
  again: string;
  architectureDescription: string;
  web: string;
  queue: string;
  https: string;
  call: string;
  query: string;
  event: string;
  gate: string;
  fanout: string;
  statesDescription: string;
  idle: string;
  working: string;
  failed: string;
  success: string;
  error: string;
  retryEdge: string;
  reset: string;
  networkDescription: string;
  cloud: string;
  office: string;
  switchNode: string;
  laptop: string;
  printer: string;
  lan: string;
  print: string;
}

function buildLocalizedSamples(
  copy: GraphmlSampleCopy,
): Record<GraphmlSampleId, string> {
  return {
    flow: buildGraphmlSample({
      description: copy.flowDescription,
      edgedefault: "directed",
      rankdir: "LR",
      body: [
        graphNode("user", copy.user, "ellipse", GRAPH_PALETTE.blueFill, GRAPH_PALETTE.blue),
        graphNode("api", "API", "hexagon", GRAPH_PALETTE.greenFill, GRAPH_PALETTE.green),
        graphNode("db", copy.database, "rectangle", GRAPH_PALETTE.amberFill, GRAPH_PALETTE.amber),
        graphEdge("user", "api", { label: copy.request, color: GRAPH_PALETTE.blue }),
        graphEdge("api", "db", { label: copy.read, color: GRAPH_PALETTE.amber }),
        graphEdge("db", "api", { label: copy.rows, color: GRAPH_PALETTE.green }),
        graphEdge("api", "user", { label: copy.response, color: GRAPH_PALETTE.violet }),
      ].join("\n"),
    }),
    decision: buildGraphmlSample({
      description: copy.decisionDescription,
      edgedefault: "directed",
      rankdir: "TB",
      body: [
        graphNode("start", copy.start, "ellipse", GRAPH_PALETTE.blueFill, GRAPH_PALETTE.blue),
        graphNode("check", copy.check, "diamond", GRAPH_PALETTE.amberFill, GRAPH_PALETTE.amber),
        graphNode("ok", copy.done, "rectangle", GRAPH_PALETTE.greenFill, GRAPH_PALETTE.green),
        graphNode("retry", copy.retryNode, "rectangle", GRAPH_PALETTE.redFill, GRAPH_PALETTE.red),
        graphEdge("start", "check", { color: GRAPH_PALETTE.slate }),
        graphEdge("check", "ok", { label: copy.yes, color: GRAPH_PALETTE.green }),
        graphEdge("check", "retry", { label: copy.no, color: GRAPH_PALETTE.red }),
        graphEdge("retry", "check", {
          label: copy.again,
          color: GRAPH_PALETTE.amber,
          dashed: true,
        }),
      ].join("\n"),
    }),
    architecture: buildGraphmlSample({
      description: copy.architectureDescription,
      edgedefault: "directed",
      rankdir: "LR",
      body: [
        graphNode("user", copy.user, "ellipse", GRAPH_PALETTE.blueFill, GRAPH_PALETTE.blue),
        graphNode("web", copy.web, "rectangle", GRAPH_PALETTE.skyFill, GRAPH_PALETTE.sky),
        graphNode("api", "API", "hexagon", GRAPH_PALETTE.greenFill, GRAPH_PALETTE.green),
        graphNode("queue", copy.queue, "rectangle", GRAPH_PALETTE.violetFill, GRAPH_PALETTE.violet),
        graphNode("db", copy.database, "rectangle", GRAPH_PALETTE.amberFill, GRAPH_PALETTE.amber),
        graphEdge("user", "web", { label: copy.https, color: GRAPH_PALETTE.blue }),
        graphEdge("web", "api", { label: copy.call, color: GRAPH_PALETTE.sky }),
        graphEdge("api", "db", { label: copy.query, color: GRAPH_PALETTE.amber }),
        graphEdge("api", "queue", {
          label: copy.event,
          color: GRAPH_PALETTE.violet,
          dashed: true,
        }),
        `    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">${GRAPH_PALETTE.amberFill}</data>
      <data key="stroke">${GRAPH_PALETTE.amber}</data>
      <data key="label">${copy.gate}</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>`,
        `    <hyperedge id="fanout">
      <desc>${copy.fanout}</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>`,
        graphEdge("api", "gate", { label: copy.gate, color: GRAPH_PALETTE.amber }),
      ].join("\n"),
    }),
    states: buildGraphmlSample({
      description: copy.statesDescription,
      edgedefault: "directed",
      rankdir: "RL",
      body: [
        graphNode("idle", copy.idle, "ellipse", GRAPH_PALETTE.slateFill, GRAPH_PALETTE.slate),
        graphNode("work", copy.working, "rectangle", GRAPH_PALETTE.blueFill, GRAPH_PALETTE.blue),
        graphNode("done", copy.done, "ellipse", GRAPH_PALETTE.greenFill, GRAPH_PALETTE.green),
        graphNode("fail", copy.failed, "diamond", GRAPH_PALETTE.redFill, GRAPH_PALETTE.red),
        graphEdge("idle", "work", { label: copy.start, color: GRAPH_PALETTE.blue }),
        graphEdge("work", "done", { label: copy.success, color: GRAPH_PALETTE.green }),
        graphEdge("work", "fail", { label: copy.error, color: GRAPH_PALETTE.red }),
        graphEdge("fail", "idle", { label: copy.retryEdge, color: GRAPH_PALETTE.amber, dashed: true }),
        graphEdge("done", "idle", { label: copy.reset, color: GRAPH_PALETTE.slate }),
      ].join("\n"),
    }),
    network: buildGraphmlSample({
      description: copy.networkDescription,
      edgedefault: "directed",
      rankdir: "TB",
      body: `    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">${GRAPH_PALETTE.skyFill}</data>
      <data key="stroke">${GRAPH_PALETTE.sky}</data>
      <data key="label">${copy.cloud}</data>
    </node>
    <node id="office">
      <data key="label">${copy.office}</data>
      <data key="fill">${GRAPH_PALETTE.slateFill}</data>
      <data key="stroke">${GRAPH_PALETTE.slate}</data>
      <graph id="office-graph" edgedefault="undirected">
${graphNode("switch", copy.switchNode, "hexagon", GRAPH_PALETTE.violetFill, GRAPH_PALETTE.violet).replaceAll("    <", "        <")}
${graphNode("laptop", copy.laptop, "rectangle", GRAPH_PALETTE.greenFill, GRAPH_PALETTE.green).replaceAll("    <", "        <")}
${graphNode("printer", copy.printer, "rectangle", GRAPH_PALETTE.orangeFill, GRAPH_PALETTE.orange).replaceAll("    <", "        <")}
${graphEdge("switch", "laptop", { label: copy.lan, color: GRAPH_PALETTE.green }).replaceAll("    <", "        <")}
${graphEdge("switch", "printer", { label: copy.print, color: GRAPH_PALETTE.orange }).replaceAll("    <", "        <")}
      </graph>
    </node>
${graphEdge("cloud", "switch", {
  label: "VPN",
  color: GRAPH_PALETTE.slate,
  dashed: true,
  directed: false,
})}`,
    }),
  };
}

const GRAPHML_SAMPLES_RU = buildLocalizedSamples({
  flowDescription: "Поток запроса слева направо: цвета узлов и подписи встречных стрелок",
  user: "Пользователь",
  database: "База",
  request: "Запрос",
  read: "Чтение",
  rows: "Данные",
  response: "Ответ",
  decisionDescription: "Развилка сверху вниз: ромб, цвета веток Да и Нет",
  start: "Старт",
  check: "Проверка",
  done: "Готово",
  retryNode: "Повтор",
  yes: "Да",
  no: "Нет",
  again: "Ещё раз",
  architectureDescription: "Архитектура слева направо, пунктир для события",
  web: "Веб",
  queue: "Очередь",
  https: "HTTPS",
  call: "Вызов",
  query: "Запрос",
  event: "Событие",
  gate: "Шлюз",
  fanout: "Рассылка",
  statesDescription: "Состояния справа налево, с циклом возврата",
  idle: "Ожидание",
  working: "Обработка",
  failed: "Ошибка",
  success: "Успех",
  error: "Сбой",
  retryEdge: "Повтор",
  reset: "Сброс",
  networkDescription: "Сеть сверху вниз: группа, цвета и подписи соседних связей",
  cloud: "Облако",
  office: "Офис",
  switchNode: "Коммутатор",
  laptop: "Ноутбук",
  printer: "Принтер",
  lan: "Сеть",
  print: "Печать",
});

const GRAPHML_SAMPLES_EN = buildLocalizedSamples({
  flowDescription: "Request flow left to right: node colors and labels on opposing arrows",
  user: "User",
  database: "Database",
  request: "Request",
  read: "Read",
  rows: "Rows",
  response: "Response",
  decisionDescription: "Decision top to bottom: diamond with colored Yes and No branches",
  start: "Start",
  check: "Check",
  done: "Done",
  retryNode: "Retry",
  yes: "Yes",
  no: "No",
  again: "Again",
  architectureDescription: "Left-to-right architecture, dashed event edge",
  web: "Web",
  queue: "Queue",
  https: "HTTPS",
  call: "Call",
  query: "Query",
  event: "Event",
  gate: "Gateway",
  fanout: "Broadcast",
  statesDescription: "States right to left, with a return cycle",
  idle: "Idle",
  working: "Working",
  failed: "Failed",
  success: "Success",
  error: "Error",
  retryEdge: "Retry",
  reset: "Reset",
  networkDescription: "Network top to bottom: group, colors, and labels on neighboring links",
  cloud: "Cloud",
  office: "Office",
  switchNode: "Switch",
  laptop: "Laptop",
  printer: "Printer",
  lan: "LAN",
  print: "Print",
});

const GRAPHML_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<GraphmlSampleId, string>
> = {
  ru: GRAPHML_SAMPLES_RU,
  en: GRAPHML_SAMPLES_EN,
};

const ALL_GRAPHML_SAMPLE_SOURCES = new Set<string>();
for (const locale of ["ru", "en"] as AppLocale[]) {
  for (const id of GRAPHML_SAMPLE_IDS) {
    ALL_GRAPHML_SAMPLE_SOURCES.add(GRAPHML_SOURCES_BY_LOCALE[locale][id]);
  }
}

export function getGraphmlSampleSource(
  id: GraphmlSampleId,
  locale: AppLocale,
): string {
  return GRAPHML_SOURCES_BY_LOCALE[locale][id];
}

export function findGraphmlSampleId(
  source: string,
  locale: AppLocale,
): GraphmlSampleId | null {
  for (const id of GRAPHML_SAMPLE_IDS) {
    if (GRAPHML_SOURCES_BY_LOCALE[locale][id] === source) {
      return id;
    }
  }

  return null;
}

export function isGraphmlSampleSource(source: string): boolean {
  return ALL_GRAPHML_SAMPLE_SOURCES.has(source);
}

export const graphmlSampleCatalog: SampleCatalog = {
  ids: GRAPHML_SAMPLE_IDS,
  getSource(id, locale) {
    return getGraphmlSampleSource(id as GraphmlSampleId, locale);
  },
  findId(source, locale) {
    return findGraphmlSampleId(source, locale);
  },
  isSampleSource(source) {
    return isGraphmlSampleSource(source);
  },
};
