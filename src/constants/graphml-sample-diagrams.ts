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
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>`;

interface GraphmlSampleParts {
  description: string;
  edgedefault: "directed" | "undirected";
  rankdir?: "LR";
  body: string;
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

const GRAPHML_SAMPLES_RU: Record<GraphmlSampleId, string> = {
  flow: buildGraphmlSample({
    description: "Поток запроса: блоки, подписи и стрелки",
    edgedefault: "directed",
    body: `    <node id="user">
      <data key="shape">ellipse</data>
      <data key="label">Пользователь</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="label">База</data>
    </node>
    <edge source="user" target="api">
      <data key="edgeLabel">Запрос</data>
    </edge>
    <edge source="api" target="db">
      <data key="edgeLabel">Чтение</data>
    </edge>
    <edge source="db" target="api">
      <data key="edgeLabel">Данные</data>
    </edge>
    <edge source="api" target="user">
      <data key="edgeLabel">Ответ</data>
    </edge>`,
  }),
  decision: buildGraphmlSample({
    description: "Развилка: ромб, ветки Да и Нет",
    edgedefault: "directed",
    body: `    <node id="start">
      <data key="shape">ellipse</data>
      <data key="label">Старт</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="label">Проверка</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="label">Готово</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="label">Повтор</data>
    </node>
    <edge source="start" target="check"/>
    <edge source="check" target="ok">
      <data key="edgeLabel">Да</data>
    </edge>
    <edge source="check" target="retry">
      <data key="edgeLabel">Нет</data>
    </edge>
    <edge source="retry" target="check">
      <data key="edgeLabel">Ещё раз</data>
    </edge>`,
  }),
  architecture: buildGraphmlSample({
    description: "Архитектура слева направо, пунктир для события",
    edgedefault: "directed",
    rankdir: "LR",
    body: `    <node id="user">
      <data key="shape">ellipse</data>
      <data key="label">Пользователь</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="label">Веб</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="label">Очередь</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="label">База</data>
    </node>
    <edge source="user" target="web">
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="edgeLabel">Вызов</data>
    </edge>
    <edge source="api" target="db">
      <data key="edgeLabel">Запрос</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="edgeLabel">Событие</data>
    </edge>`,
  }),
  states: buildGraphmlSample({
    description: "Состояния с циклом возврата",
    edgedefault: "directed",
    body: `    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="label">Ожидание</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="label">Обработка</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="label">Готово</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="label">Ошибка</data>
    </node>
    <edge source="idle" target="work">
      <data key="edgeLabel">Старт</data>
    </edge>
    <edge source="work" target="done">
      <data key="edgeLabel">Успех</data>
    </edge>
    <edge source="work" target="fail">
      <data key="edgeLabel">Сбой</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="edgeLabel">Повтор</data>
    </edge>
    <edge source="done" target="idle">
      <data key="edgeLabel">Сброс</data>
    </edge>`,
  }),
  network: buildGraphmlSample({
    description: "Группа с вложенным графом и связи без стрелок",
    edgedefault: "directed",
    body: `    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="label">Облако</data>
    </node>
    <node id="office">
      <data key="label">Офис</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="label">Коммутатор</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="label">Ноутбук</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="label">Принтер</data>
        </node>
        <edge source="switch" target="laptop"/>
        <edge source="switch" target="printer"/>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="edgeLabel">VPN</data>
    </edge>`,
  }),
};

const GRAPHML_SAMPLES_EN: Record<GraphmlSampleId, string> = {
  flow: buildGraphmlSample({
    description: "Request flow: blocks, labels, and arrows",
    edgedefault: "directed",
    body: `    <node id="user">
      <data key="shape">ellipse</data>
      <data key="label">User</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="label">Database</data>
    </node>
    <edge source="user" target="api">
      <data key="edgeLabel">Request</data>
    </edge>
    <edge source="api" target="db">
      <data key="edgeLabel">Read</data>
    </edge>
    <edge source="db" target="api">
      <data key="edgeLabel">Rows</data>
    </edge>
    <edge source="api" target="user">
      <data key="edgeLabel">Response</data>
    </edge>`,
  }),
  decision: buildGraphmlSample({
    description: "Decision: diamond with Yes and No branches",
    edgedefault: "directed",
    body: `    <node id="start">
      <data key="shape">ellipse</data>
      <data key="label">Start</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="label">Check</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="label">Done</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="label">Retry</data>
    </node>
    <edge source="start" target="check"/>
    <edge source="check" target="ok">
      <data key="edgeLabel">Yes</data>
    </edge>
    <edge source="check" target="retry">
      <data key="edgeLabel">No</data>
    </edge>
    <edge source="retry" target="check">
      <data key="edgeLabel">Again</data>
    </edge>`,
  }),
  architecture: buildGraphmlSample({
    description: "Left-to-right architecture, dashed event edge",
    edgedefault: "directed",
    rankdir: "LR",
    body: `    <node id="user">
      <data key="shape">ellipse</data>
      <data key="label">User</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="label">Web</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="label">Queue</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="label">Database</data>
    </node>
    <edge source="user" target="web">
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="edgeLabel">Call</data>
    </edge>
    <edge source="api" target="db">
      <data key="edgeLabel">Query</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="edgeLabel">Event</data>
    </edge>`,
  }),
  states: buildGraphmlSample({
    description: "States with a return cycle",
    edgedefault: "directed",
    body: `    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="label">Idle</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="label">Working</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="label">Done</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="label">Failed</data>
    </node>
    <edge source="idle" target="work">
      <data key="edgeLabel">Start</data>
    </edge>
    <edge source="work" target="done">
      <data key="edgeLabel">Success</data>
    </edge>
    <edge source="work" target="fail">
      <data key="edgeLabel">Error</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="edgeLabel">Retry</data>
    </edge>
    <edge source="done" target="idle">
      <data key="edgeLabel">Reset</data>
    </edge>`,
  }),
  network: buildGraphmlSample({
    description: "Group with a nested graph and arrowless links",
    edgedefault: "directed",
    body: `    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="label">Cloud</data>
    </node>
    <node id="office">
      <data key="label">Office</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="label">Switch</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="label">Laptop</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="label">Printer</data>
        </node>
        <edge source="switch" target="laptop"/>
        <edge source="switch" target="printer"/>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="edgeLabel">VPN</data>
    </edge>`,
  }),
};

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
