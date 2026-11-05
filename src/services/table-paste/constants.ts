import type { DiagramFormat } from "@/constants/diagram-formats";
import type { TablePasteDiagramType, TablePasteExpectedSpec } from "./types";

export const MIN_TABLE_COLUMNS = 2;
export const WATERFALL_EXPECTED_COLUMNS = 2;
export const PIE_EXPECTED_COLUMNS = 2;
export const PACKET_EXPECTED_COLUMNS = 2;
export const QUADRANT_EXPECTED_COLUMNS = 3;
export const SANKEY_EXPECTED_COLUMNS = 3;
export const EV_EXPECTED_COLUMNS = 4;
export const BUBBLE_MIN_COLUMNS = 4;
export const BUBBLE_MAX_COLUMNS = 5;
export const XYCHART_MIN_COLUMNS = 2;
export const XYCHART_MAX_COLUMNS = 3;
export const ORGCHART_MIN_COLUMNS = 2;
export const ORGCHART_MAX_COLUMNS = 3;
export const GANTT_MIN_COLUMNS = 2;
export const GANTT_MAX_COLUMNS = 4;
export const TIMELINE_MIN_COLUMNS = 2;
export const TIMELINE_MAX_COLUMNS = 3;
export const JOURNEY_MIN_COLUMNS = 2;
export const JOURNEY_MAX_COLUMNS = 4;
export const NWDIAG_MIN_COLUMNS = 2;
export const NWDIAG_MAX_COLUMNS = 3;
export const HEATMAP_MIN_COLUMNS = 2;
export const HEATMAP_MIN_ROWS = 2;
/** Число ступеней шкалы, которую вставка добавляет, если блока scale нет. */
export const HEATMAP_DEFAULT_SCALE_BANDS = 4;
/** Нижняя граница шкалы, когда в матрице нет чисел. */
export const HEATMAP_SCALE_EMPTY_MIN = 0;
/** Ширина шкалы, когда все числа совпали или чисел нет. */
export const HEATMAP_SCALE_EMPTY_SPAN = 1;
/** Минимальный шаг границы после округления до 4 знаков. */
export const HEATMAP_SCALE_BOUND_STEP = 0.0001;
/** Цвет минимума вставляемой шкалы. */
export const HEATMAP_SCALE_COLOR_LOW = "#1565c0";
/** Цвет максимума вставляемой шкалы. */
export const HEATMAP_SCALE_COLOR_HIGH = "#c62828";

export const DEFAULT_JOURNEY_SCORE = 5;
export const MIN_JOURNEY_SCORE = 1;
export const MAX_JOURNEY_SCORE = 5;
export const PERCENT_NORMALIZATION_DIVISOR = 100;
export const DEFAULT_GANTT_DURATION = "3d";
export const DEFAULT_GANTT_START_DATE = "2026-01-01";
export const DEFAULT_NWDIAG_NETWORK = "lan";

const EXPECTED_SPECS_BY_TYPE: Record<
  TablePasteDiagramType,
  Omit<TablePasteExpectedSpec, "diagramType" | "format">
> = {
  waterfall: {
    titleKey: "tablePaste.type.waterfall",
    columnsKey: "tablePaste.expected.waterfall.columns",
    rulesKey: "tablePaste.expected.waterfall.rules",
    sampleHeadersKey: "tablePaste.expected.waterfall.headers",
    sampleRows: [
      ["Q1 старт", "120"],
      ["Q2 рост", "+180"],
      ["Q3 отток", "-60"],
      ["Итого H1", ""],
    ],
  },
  pie: {
    titleKey: "tablePaste.type.pie",
    columnsKey: "tablePaste.expected.pie.columns",
    rulesKey: "tablePaste.expected.pie.rules",
    sampleHeadersKey: "tablePaste.expected.pie.headers",
    sampleRows: [
      ["PlantUML", "45"],
      ["Mermaid", "35"],
      ["D2", "20"],
    ],
  },
  heatmap: {
    titleKey: "tablePaste.type.heatmap",
    columnsKey: "tablePaste.expected.heatmap.columns",
    rulesKey: "tablePaste.expected.heatmap.rules",
    sampleHeadersKey: "tablePaste.expected.heatmap.headers",
    sampleRows: [
      ["Утро", "20", "35", "50"],
      ["День", "60", "75", "85"],
      ["Вечер", "40", "45", "65"],
    ],
  },
  bubble: {
    titleKey: "tablePaste.type.bubble",
    columnsKey: "tablePaste.expected.bubble.columns",
    rulesKey: "tablePaste.expected.bubble.rules",
    sampleHeadersKey: "tablePaste.expected.bubble.headers",
    sampleRows: [
      ["Продукт A", "8.2", "22", "340", "Software"],
      ["Продукт B", "2.1", "25", "180", "Software"],
      ["Продукт C", "7.4", "4", "520", "Hardware"],
    ],
  },
  ev: {
    titleKey: "tablePaste.type.ev",
    columnsKey: "tablePaste.expected.ev.columns",
    rulesKey: "tablePaste.expected.ev.rules",
    sampleHeadersKey: "tablePaste.expected.ev.headers",
    sampleRows: [
      ["1", "10", "8", "12"],
      ["2", "25", "20", "28"],
      ["3", "45", "40", "50"],
    ],
  },
  xychart: {
    titleKey: "tablePaste.type.xychart",
    columnsKey: "tablePaste.expected.xychart.columns",
    rulesKey: "tablePaste.expected.xychart.rules",
    sampleHeadersKey: "tablePaste.expected.xychart.headers",
    sampleRows: [
      ["Янв", "20", "18"],
      ["Фев", "35", "30"],
      ["Мар", "40", "42"],
    ],
  },
  quadrant: {
    titleKey: "tablePaste.type.quadrant",
    columnsKey: "tablePaste.expected.quadrant.columns",
    rulesKey: "tablePaste.expected.quadrant.rules",
    sampleHeadersKey: "tablePaste.expected.quadrant.headers",
    sampleRows: [
      ["Редактор", "0.85", "0.35"],
      ["Экспорт", "0.70", "0.80"],
      ["Темы", "0.25", "0.20"],
    ],
  },
  sankey: {
    titleKey: "tablePaste.type.sankey",
    columnsKey: "tablePaste.expected.sankey.columns",
    rulesKey: "tablePaste.expected.sankey.rules",
    sampleHeadersKey: "tablePaste.expected.sankey.headers",
    sampleRows: [
      ["Визит", "Каталог", "80"],
      ["Каталог", "Корзина", "50"],
      ["Корзина", "Оплата", "40"],
    ],
  },
  orgchart: {
    titleKey: "tablePaste.type.orgchart",
    columnsKey: "tablePaste.expected.orgchart.columns",
    rulesKey: "tablePaste.expected.orgchart.rules",
    sampleHeadersKey: "tablePaste.expected.orgchart.headers",
    sampleRows: [
      ["Гендиректор", "Техдир", ""],
      ["Гендиректор", "Финдир", ""],
      ["Финдир", "Бэкенд", "dotted"],
    ],
  },
  gantt: {
    titleKey: "tablePaste.type.gantt",
    columnsKey: "tablePaste.expected.gantt.columns",
    rulesKey: "tablePaste.expected.gantt.rules",
    sampleHeadersKey: "tablePaste.expected.gantt.headers",
    sampleRows: [
      ["Анализ", "2026-01-02", "5d", "Подготовка"],
      ["Прототип", "2026-01-08", "4d", "Подготовка"],
      ["Разработка", "2026-01-15", "7d", "Релиз"],
    ],
  },
  timeline: {
    titleKey: "tablePaste.type.timeline",
    columnsKey: "tablePaste.expected.timeline.columns",
    rulesKey: "tablePaste.expected.timeline.rules",
    sampleHeadersKey: "tablePaste.expected.timeline.headers",
    sampleRows: [
      ["2024", "PlantUML офлайн", "Редактор"],
      ["2025", "Mermaid и D2", "Языки"],
      ["2026", "WireMark", "Сейчас"],
    ],
  },
  journey: {
    titleKey: "tablePaste.type.journey",
    columnsKey: "tablePaste.expected.journey.columns",
    rulesKey: "tablePaste.expected.journey.rules",
    sampleHeadersKey: "tablePaste.expected.journey.headers",
    sampleRows: [
      ["Открыть каталог", "5", "Покупатель", "Выбор"],
      ["Оплатить картой", "4", "Покупатель, Банк", "Оплата"],
    ],
  },
  packet: {
    titleKey: "tablePaste.type.packet",
    columnsKey: "tablePaste.expected.packet.columns",
    rulesKey: "tablePaste.expected.packet.rules",
    sampleHeadersKey: "tablePaste.expected.packet.headers",
    sampleRows: [
      ["0-15", "Источник"],
      ["16-31", "Назначение"],
      ["32-63", "Данные"],
    ],
  },
  wbs: {
    titleKey: "tablePaste.type.wbs",
    columnsKey: "tablePaste.expected.wbs.columns",
    rulesKey: "tablePaste.expected.wbs.rules",
    sampleHeadersKey: "tablePaste.expected.wbs.headers",
    sampleRows: [
      ["Code2Graph", "Редактор", "Код"],
      ["Code2Graph", "Редактор", "Превью"],
      ["Code2Graph", "Экспорт", "SVG"],
    ],
  },
  mindmap: {
    titleKey: "tablePaste.type.mindmap",
    columnsKey: "tablePaste.expected.mindmap.columns",
    rulesKey: "tablePaste.expected.mindmap.rules",
    sampleHeadersKey: "tablePaste.expected.mindmap.headers",
    sampleRows: [
      ["Code2Graph", "Редактор", "Код"],
      ["Code2Graph", "Редактор", "Превью"],
      ["Code2Graph", "Экспорт", "SVG"],
    ],
  },
  nwdiag: {
    titleKey: "tablePaste.type.nwdiag",
    columnsKey: "tablePaste.expected.nwdiag.columns",
    rulesKey: "tablePaste.expected.nwdiag.rules",
    sampleHeadersKey: "tablePaste.expected.nwdiag.headers",
    sampleRows: [
      ["web", "10.0.0.1", "office"],
      ["api", "10.0.0.2", "office"],
      ["cdn", "203.0.113.20", "public"],
    ],
  },
  wireframe: {
    titleKey: "tablePaste.type.wireframe",
    columnsKey: "tablePaste.expected.wireframe.columns",
    rulesKey: "tablePaste.expected.wireframe.rules",
    sampleHeadersKey: "tablePaste.expected.wireframe.headers",
    sampleRows: [
      ["Вход", "Аня", "Черновик", "128"],
      ["Оболочка", "Марк", "Готово", "860"],
    ],
  },
};

export function getTablePasteExpectedSpec(
  diagramType: TablePasteDiagramType,
  format: DiagramFormat,
): TablePasteExpectedSpec {
  return {
    diagramType,
    format,
    ...EXPECTED_SPECS_BY_TYPE[diagramType],
  };
}
