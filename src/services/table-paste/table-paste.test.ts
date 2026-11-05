import { describe, expect, it } from "vitest";
import { heatmapEngine } from "../mermaid/ext/engines/heatmap";
import {
  HEATMAP_SCALE_COLOR_HIGH,
  HEATMAP_SCALE_COLOR_LOW,
} from "./constants";
import {
  applyTableFromClipboardText,
  detectTableDiagramType,
  supportsTablePaste,
} from "./index";

describe("detectTableDiagramType & supportsTablePaste", () => {
  it("detects all 16 supported diagram types and hides button for non-tabular types", () => {
    expect(detectTableDiagramType("waterfall\n=100 : Q1", "mermaid")).toBe("waterfall");
    expect(detectTableDiagramType("pie\n\"A\" : 10", "mermaid")).toBe("pie");
    expect(detectTableDiagramType("heatmap\nx A, B\ndata\nR : 1, 2", "mermaid")).toBe("heatmap");
    expect(detectTableDiagramType("bubble\ndata", "mermaid")).toBe("bubble");
    expect(detectTableDiagramType("ev\ndays 1, 2", "mermaid")).toBe("ev");
    expect(detectTableDiagramType("boxplot\nA : 1, 2, 3, 4, 5", "mermaid")).toBe("boxplot");
    expect(detectTableDiagramType("treemap\nA : 10", "mermaid")).toBe("treemap");
    expect(detectTableDiagramType("radar\naxes A, B, C", "mermaid")).toBe("radar");
    expect(detectTableDiagramType("voronoi\ndata", "mermaid")).toBe("voronoi");
    expect(detectTableDiagramType("clustered\nrotate 90", "mermaid")).toBe("clustered");
    expect(detectTableDiagramType("xychart-beta\nbar [1, 2]", "mermaid")).toBe("xychart");
    expect(detectTableDiagramType("quadrantChart\nA: [0.5, 0.5]", "mermaid")).toBe("quadrant");
    expect(detectTableDiagramType("sankey-beta\nA,B,10", "mermaid")).toBe("sankey");
    expect(detectTableDiagramType("orgchart\nA -> B", "mermaid")).toBe("orgchart");
    expect(detectTableDiagramType("gantt\ntitle Plan", "mermaid")).toBe("gantt");
    expect(detectTableDiagramType("@startgantt\n@endgantt", "plantuml")).toBe("gantt");
    expect(detectTableDiagramType("timeline\n2024 : A", "mermaid")).toBe("timeline");
    expect(detectTableDiagramType("@startchronology\n@endchronology", "plantuml")).toBe("timeline");
    expect(detectTableDiagramType("journey\ntitle J", "mermaid")).toBe("journey");
    expect(detectTableDiagramType("packet-beta\n0-15: \"A\"", "mermaid")).toBe("packet");
    expect(detectTableDiagramType("@startwbs\n* Root\n@endwbs", "plantuml")).toBe("wbs");
    expect(detectTableDiagramType("@startmindmap\n* Root\n@endmindmap", "plantuml")).toBe("mindmap");
    expect(detectTableDiagramType("mindmap\n  root((A))", "mermaid")).toBe("mindmap");
    expect(detectTableDiagramType("@startnwdiag\n@endnwdiag", "plantuml")).toBe("nwdiag");
    expect(detectTableDiagramType("Wireframe #dashboard landscape", "wiremark")).toBe("wireframe");

    // Non-tabular diagrams must not show the button
    expect(supportsTablePaste("sequenceDiagram\nAlice->>Bob: Hi", "mermaid")).toBe(false);
    expect(supportsTablePaste("flowchart TD\nA --> B", "mermaid")).toBe(false);
    expect(supportsTablePaste("@startuml\nclass User\n@enduml", "plantuml")).toBe(false);
    expect(supportsTablePaste("direction: right\na -> b", "d2")).toBe(false);
    expect(supportsTablePaste("<graphml/>", "graphml")).toBe(false);
  });
});

describe("waterfall table paste", () => {
  const baseWaterfall = [
    "waterfall",
    "title Выручка 2026",
    "y \"млн ₽\" 0 --> 500",
    "grid 100",
    "=120 : Q1 старт",
    "+180 : Q2 рост",
    "= : Итог",
  ].join("\n");

  it("parses Label | Value columns with header, positive, negative, and empty total cells", () => {
    const tsv = [
      "Период\tЗначение",
      "Q1 старт\t150",
      "Q2 продажи\t220",
      "Q3 возвраты\t-45",
      "Итого H1\t",
      "Q4 бонус\t+80",
      "Итог года\t",
    ].join("\n");

    const res = applyTableFromClipboardText({
      clipboardText: tsv,
      source: baseWaterfall,
      format: "mermaid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.snippet).toBe(
      [
        "=150 : Q1 старт",
        "+220 : Q2 продажи",
        "-45 : Q3 возвраты",
        "= : Итого H1",
        "+80 : Q4 бонус",
        "= : Итог года",
      ].join("\n"),
    );
    expect(res.fullSource).toContain("title Выручка 2026");
    expect(res.fullSource).toContain("=150 : Q1 старт");
    expect(res.fullSource).not.toContain("=120 : Q1 старт");
  });

  it("supports reversed column order (Value | Label)", () => {
    const tsv = [
      "100\tСтарт",
      "50\tРост",
      "-20\tОтток",
      "\tФинал",
    ].join("\n");

    const res = applyTableFromClipboardText({
      clipboardText: tsv,
      source: baseWaterfall,
      format: "mermaid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.snippet).toBe(
      [
        "=100 : Старт",
        "+50 : Рост",
        "-20 : Отток",
        "= : Финал",
      ].join("\n"),
    );
  });

  it("returns structured error with expected table spec when clipboard is empty or has >2 columns", () => {
    const emptyRes = applyTableFromClipboardText({
      clipboardText: "   ",
      source: baseWaterfall,
      format: "mermaid",
    });
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) {
      expect(emptyRes.error.code).toBe("empty_clipboard");
      expect(emptyRes.error.expected.diagramType).toBe("waterfall");
      expect(emptyRes.error.expected.sampleRows.length).toBeGreaterThan(0);
    }

    const threeColsRes = applyTableFromClipboardText({
      clipboardText: "A\t10\t20\nB\t30\t40",
      source: baseWaterfall,
      format: "mermaid",
    });
    expect(threeColsRes.ok).toBe(false);
    if (!threeColsRes.ok) {
      expect(threeColsRes.error.code).toBe("too_many_columns");
      expect(threeColsRes.error.reasonParams).toEqual({ expected: 2, actual: 3 });
    }

    const notATableRes = applyTableFromClipboardText({
      clipboardText: "Просто строка текста без табуляции",
      source: baseWaterfall,
      format: "mermaid",
    });
    expect(notATableRes.ok).toBe(false);
    if (!notATableRes.ok) {
      expect(notATableRes.error.code).toBe("not_a_table");
    }
  });
});

describe("Category A & B table parsers", () => {
  it("parses pie table", () => {
    const res = applyTableFromClipboardText({
      clipboardText: "Язык\tДоля\nPlantUML\t60\nMermaid\t40",
      source: "pie showData\n  title Доли\n  \"Old\" : 100",
      format: "mermaid",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.fullSource).toContain("\"PlantUML\" : 60");
      expect(res.fullSource).toContain("\"Mermaid\" : 40");
      expect(res.fullSource).not.toContain("\"Old\" : 100");
    }
  });

  it("parses heatmap matrix with empty cells", () => {
    const res = applyTableFromClipboardText({
      clipboardText: "Смена\tПн\tВт\nУтро\t20\t35\nДень\t\t75",
      source: "heatmap\ntitle Нагрузка\nx A, B\ny R1\ndata\nR1 : 1, 2",
      format: "mermaid",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.fullSource).toContain("x Пн, Вт");
      expect(res.fullSource).toContain("y Утро, День");
      expect(res.fullSource).toContain("Утро : 20, 35");
      expect(res.fullSource).toContain("День : , 75");
      const xAt = res.fullSource.indexOf("x Пн, Вт");
      const yAt = res.fullSource.indexOf("y Утро, День");
      const scaleAt = res.fullSource.indexOf("\nscale\n");
      const dataAt = res.fullSource.indexOf("\ndata\n");
      expect(xAt).toBeGreaterThan(-1);
      expect(yAt).toBeGreaterThan(xAt);
      expect(scaleAt).toBeGreaterThan(yAt);
      expect(dataAt).toBeGreaterThan(scaleAt);
      expect(res.fullSource).toContain(`20-33.75 : ${HEATMAP_SCALE_COLOR_LOW}`);
      expect(res.fullSource).toContain(`61.25+ : ${HEATMAP_SCALE_COLOR_HIGH}`);
      expect(heatmapEngine.parse(res.fullSource).ok).toBe(true);
    }
  });

  it("keeps an existing heatmap scale and places x and y before it", () => {
    const res = applyTableFromClipboardText({
      clipboardText: "Смена\tПн\tВт\nУтро\t20\t35\nДень\t40\t75",
      source: "heatmap\ntitle Нагрузка\nscale\n0-40 : #e8f5e9\n40+ : #ffebee\nx A, B\ny R1\ndata\nR1 : 1, 2",
      format: "mermaid",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const xAt = res.fullSource.indexOf("x Пн, Вт");
      const yAt = res.fullSource.indexOf("y Утро, День");
      const scaleAt = res.fullSource.indexOf("\nscale\n");
      expect(xAt).toBeGreaterThan(res.fullSource.indexOf("title Нагрузка"));
      expect(yAt).toBeGreaterThan(xAt);
      expect(scaleAt).toBeGreaterThan(yAt);
      expect(res.fullSource).toContain("0-40 : #e8f5e9");
      expect(res.fullSource).toContain("40+ : #ffebee");
      expect(res.fullSource).not.toContain(HEATMAP_SCALE_COLOR_LOW);
      expect(heatmapEngine.parse(res.fullSource).ok).toBe(true);
    }
  });

  it("builds xychart series from one, two, and many columns", () => {
    const oneColumn = applyTableFromClipboardText({
      clipboardText: "Значение\n10\n25\n40",
      source: 'xychart-beta\n    title T\n    x-axis ["A", "B", "C"]\n    y-axis "Y" 0 --> 50\n    bar [1, 2, 3]\n    line [4, 5, 6]',
      format: "mermaid",
    });
    expect(oneColumn.ok).toBe(true);
    if (oneColumn.ok) {
      expect(oneColumn.fullSource).toContain("bar [1, 2, 3]");
      expect(oneColumn.fullSource).toContain("bar [10, 25, 40]");
      expect(oneColumn.fullSource).toContain('y-axis "Y" 0 --> 50');
      expect(oneColumn.fullSource).toContain("line [4, 5, 6]");
      expect(oneColumn.fullSource).not.toContain('y-axis ""');
    }

    const newlineColumn = applyTableFromClipboardText({
      clipboardText: "10\n25\n40",
      source: "xychart-beta\n    title T",
      format: "mermaid",
    });
    expect(newlineColumn.ok).toBe(true);
    if (newlineColumn.ok) {
      expect(newlineColumn.fullSource).toContain("bar [10, 25, 40]");
      expect(newlineColumn.fullSource).not.toContain("x-axis");
      expect(newlineColumn.fullSource).not.toContain("y-axis");
    }

    const twoColumns = applyTableFromClipboardText({
      clipboardText: "Янв\t20\nФев\t35",
      source: 'xychart-beta\n    title Заказы\n    %% x-axis [не трогать комментарий]\n    x-axis ["Старое"]\n    y-axis "Заказы" 0 --> 100\n    bar [7]\n    line [9]',
      format: "mermaid",
    });
    expect(twoColumns.ok).toBe(true);
    if (twoColumns.ok) {
      expect(twoColumns.fullSource).toContain('x-axis ["Янв", "Фев"]');
      expect(twoColumns.fullSource).not.toContain('x-axis ["Старое"]');
      expect(twoColumns.fullSource).toContain("%% x-axis [не трогать комментарий]");
      expect(twoColumns.fullSource).toContain('y-axis "Заказы" 0 --> 100');
      expect(twoColumns.fullSource).not.toContain('y-axis ""');
      expect(twoColumns.fullSource).toContain("bar [20, 35]");
      expect(twoColumns.fullSource).not.toContain("bar [7]");
      expect(twoColumns.fullSource).toContain("line [9]");
    }

    const manyColumns = applyTableFromClipboardText({
      clipboardText: "Месяц\tПлан\tФакт\tПрогноз\nЯнв\t1\t2\t3\nФев\t4\t5\t6",
      source: "xychart-beta\n    title Заказы",
      format: "mermaid",
    });
    expect(manyColumns.ok).toBe(true);
    if (manyColumns.ok) {
      expect(manyColumns.fullSource).toContain('x-axis ["Янв", "Фев"]');
      expect(manyColumns.fullSource).toContain('y-axis "" 0 --> 11');
      expect(manyColumns.fullSource).toContain("bar [1, 4]");
      expect(manyColumns.fullSource).toContain("bar [2, 5]");
      expect(manyColumns.fullSource).toContain("bar [3, 6]");
    }
  });

  it("parses bubble, ev, xychart, quadrant, and sankey tables", () => {
    const bubbleRes = applyTableFromClipboardText({
      clipboardText: "Name\tX\tY\tSize\tGroup\nProd A\t5\t10\t200\tSaaS",
      source: "bubble\nx \"X\" 0 --> 10\ny \"Y\" 0 --> 20\ndata\nOld : x=1, y=1, size=10",
      format: "mermaid",
    });
    expect(bubbleRes.ok).toBe(true);
    if (bubbleRes.ok) {
      expect(bubbleRes.fullSource).toContain("Prod A : x=5, y=10, size=200, group=SaaS");
    }

    const evRes = applyTableFromClipboardText({
      clipboardText: "Day\tPV\tEV\tAC\n1\t10\t8\t12\n2\t25\t20\t28",
      source: "ev\ntitle Бюджет\ndays 1\npv 1\nev 1\nac 1\ngrid",
      format: "mermaid",
    });
    expect(evRes.ok).toBe(true);
    if (evRes.ok) {
      expect(evRes.fullSource).toBe(
        ["ev", "title Бюджет", "days 1, 2", "pv 10, 25", "ev 8, 20", "ac 12, 28", "grid"].join(
          "\n",
        ),
      );
    }

    const xyRes = applyTableFromClipboardText({
      clipboardText: "Месяц\tПлан\tФакт\nЯнв\t20\t18\nФев\t35\t30",
      source: "xychart-beta\n  title Заказы",
      format: "mermaid",
    });
    expect(xyRes.ok).toBe(true);
    if (xyRes.ok) {
      expect(xyRes.fullSource).toContain("x-axis [\"Янв\", \"Фев\"]");
      expect(xyRes.fullSource).toContain('y-axis "" 0 --> 39');
      expect(xyRes.fullSource).toContain("bar [20, 35]");
      expect(xyRes.fullSource).toContain("bar [18, 30]");
      expect(xyRes.fullSource).not.toContain("line [");
    }

    const quadRes = applyTableFromClipboardText({
      clipboardText: "Item\tX\tY\nРедактор\t85%\t35%",
      source: "quadrantChart\n  title Приоритеты",
      format: "mermaid",
    });
    expect(quadRes.ok).toBe(true);
    if (quadRes.ok) {
      expect(quadRes.fullSource).toContain("Редактор: [0.85, 0.35]");
    }

    const sankeyRes = applyTableFromClipboardText({
      clipboardText: "From\tTo\tFlow\nVisit\tCatalog\t80",
      source: "sankey-beta\nOld,Node,10",
      format: "mermaid",
    });
    expect(sankeyRes.ok).toBe(true);
    if (sankeyRes.ok) {
      expect(sankeyRes.fullSource).toContain("Visit,Catalog,80");
      expect(sankeyRes.fullSource).not.toContain("Old,Node,10");
    }
  });

  it("keeps the ev diagram header and places pasted series after title", () => {
    const clipboardText = "Day\tPV\tEV\tAC\n1\t10\t8\t12\n2\t25\t20\t28";

    const headerOnly = applyTableFromClipboardText({
      clipboardText,
      source: "ev\ntitle Бюджет\ngrid",
      format: "mermaid",
    });
    expect(headerOnly.ok).toBe(true);
    if (headerOnly.ok) {
      expect(headerOnly.fullSource).toBe(
        ["ev", "title Бюджет", "grid", "days 1, 2", "pv 10, 25", "ev 8, 20", "ac 12, 28"].join(
          "\n",
        ),
      );
    }

    const evchart = applyTableFromClipboardText({
      clipboardText,
      source: "evchart\ntitle Бюджет\ndays 1\npv 1\nev 1\nac 1",
      format: "mermaid",
    });
    expect(evchart.ok).toBe(true);
    if (evchart.ok) {
      expect(evchart.fullSource.startsWith("evchart\ntitle Бюджет\n")).toBe(true);
      expect(evchart.fullSource).toContain("days 1, 2");
    }
  });

  it("parses orgchart, gantt, timeline, journey, packet, wbs, mindmap, nwdiag, and wiremark Table", () => {
    const ganttHeaderless = applyTableFromClipboardText({
      clipboardText:
        "Задача анализа\t2026-01-02\t5d\tСекция 1\nЭтап прототипа\t2026-01-08\t4d\tПодготовка",
      source: "@startgantt\nproject starts 2026-01-01\n@endgantt",
      format: "plantuml",
    });
    expect(ganttHeaderless.ok).toBe(true);
    if (ganttHeaderless.ok) {
      expect(ganttHeaderless.fullSource).toContain("[Задача анализа] lasts 5 days");
      expect(ganttHeaderless.fullSource).toContain("[Задача анализа] starts 2026-01-02");
      expect(ganttHeaderless.fullSource).toContain("[Этап прототипа] lasts 4 days");
    }

    const ganttWithHeader = applyTableFromClipboardText({
      clipboardText:
        "Задача\tНачало\tДлительность\tСекция\nАнализ\t2026-01-02\t5d\tПодготовка\nПрототип\t2026-01-08\t4d\tПодготовка",
      source: "@startgantt\n@endgantt",
      format: "plantuml",
    });
    expect(ganttWithHeader.ok).toBe(true);
    if (ganttWithHeader.ok) {
      expect(ganttWithHeader.fullSource).not.toContain("[Задача]");
      expect(ganttWithHeader.fullSource).toContain("[Анализ] lasts 5 days");
      expect(ganttWithHeader.fullSource).toContain("[Прототип] starts 2026-01-08");
    }

    const ganttNamedRows = applyTableFromClipboardText({
      clipboardText: "Этап 1\t5\nStart design\t3 days",
      source: "@startgantt\n@endgantt",
      format: "plantuml",
    });
    expect(ganttNamedRows.ok).toBe(true);
    if (ganttNamedRows.ok) {
      expect(ganttNamedRows.fullSource).toContain("[Этап 1] lasts 5 days");
      expect(ganttNamedRows.fullSource).toContain("[Start design] lasts 3 days");
    }

    const orgRes = applyTableFromClipboardText({
      clipboardText: "Руководитель\tПодчинённый\tСвязь\nCEO\tCTO\t\nCFO\tBackend\tdotted",
      source: "orgchart\nA -> B",
      format: "mermaid",
    });
    expect(orgRes.ok).toBe(true);
    if (orgRes.ok) {
      expect(orgRes.fullSource).toContain("CEO -> CTO");
      expect(orgRes.fullSource).toContain("CFO -.-> Backend");
    }

    const wbsRes = applyTableFromClipboardText({
      clipboardText: "Проект\tРаздел\tЗадача\nCode2Graph\tРедактор\tКод\nCode2Graph\tРедактор\tПревью",
      source: "@startwbs\n* Old\n@endwbs",
      format: "plantuml",
    });
    expect(wbsRes.ok).toBe(true);
    if (wbsRes.ok) {
      expect(wbsRes.fullSource).toContain("* Code2Graph\n** Редактор\n*** Код\n*** Превью");
    }

    const wiremarkRes = applyTableFromClipboardText({
      clipboardText: "Название\tПросмотры\nВход\t128\nДашборд\t860",
      source: "Wireframe #dashboard landscape\n  Table small\n    TableBody\n      TableRow\n        TableCell \"Old\"",
      format: "wiremark",
    });
    expect(wiremarkRes.ok).toBe(true);
    if (wiremarkRes.ok) {
      expect(wiremarkRes.fullSource).toContain("TableCell \"Название\"");
      expect(wiremarkRes.fullSource).toContain("TableCell \"128\" align=right");
      expect(wiremarkRes.fullSource).not.toContain("TableCell \"Old\"");
    }
  });

  it("parses boxplot, treemap, radar, voronoi, and clustered tables while preserving directives", () => {
    const boxRes = applyTableFromClipboardText({
      clipboardText: "Сервис\tMin\tQ1\tMedian\tQ3\tMax\nAPI\t15\t30\t45\t70\t110",
      source: "boxplot\ntitle Отклик\ncolors box=#0969da\nOld : 1, 2, 3, 4, 5",
      format: "mermaid",
    });
    expect(boxRes.ok).toBe(true);
    if (boxRes.ok) {
      expect(boxRes.fullSource).toContain("colors box=#0969da");
      expect(boxRes.fullSource).toContain("API : min=15, q1=30, median=45, q3=70, max=110");
      expect(boxRes.fullSource).not.toContain("Old");
    }

    const treeRes = applyTableFromClipboardText({
      clipboardText: "Группа\tЭлемент\tВес\tЦвет\nИТ\tОблако\t420\t#0969da\nИТ\tСеть\t180\t",
      source: "treemap\ntitle Бюджет\nOld : 10",
      format: "mermaid",
    });
    expect(treeRes.ok).toBe(true);
    if (treeRes.ok) {
      expect(treeRes.fullSource).toContain("ИТ / Облако : 420 color=#0969da");
      expect(treeRes.fullSource).toContain("ИТ / Сеть : 180");
    }

    const radarRes = applyTableFromClipboardText({
      clipboardText: "Серия\tСкорость\tНадёжность\tУдобство\nПлатформа А\t85\t90\t78",
      source: "radar\ntitle Оценка\nscale 0 --> 100\naxes X, Y, Z\nseries Old : 1, 2, 3",
      format: "mermaid",
    });
    expect(radarRes.ok).toBe(true);
    if (radarRes.ok) {
      expect(radarRes.fullSource).toContain("axes Скорость, Надёжность, Удобство");
      expect(radarRes.fullSource).toContain("series Платформа А : 85, 90, 78");
      expect(radarRes.fullSource).toContain("scale 0 --> 100");
    }

    const voronoiRes = applyTableFromClipboardText({
      clipboardText: "Склад\tX\tY\tГруппа\nСевер\t48\t82\tМагистраль",
      source: "voronoi\ntitle Склады\ndata\nOld : x=1, y=2",
      format: "mermaid",
    });
    expect(voronoiRes.ok).toBe(true);
    if (voronoiRes.ok) {
      expect(voronoiRes.fullSource).toContain("Север : x=48, y=82, group=Магистраль");
      expect(voronoiRes.fullSource).not.toContain("Old");
    }

    const clusteredRes = applyTableFromClipboardText({
      clipboardText: "Квартал\tМосква\tРегионы\nQ1\t120\t80\nQ2\t145\t95",
      source: "clustered\ntitle Выручка\nrotate 90\ncolors s1=#0969da s2=#8250df\ncategories A\nseries S : 1",
      format: "mermaid",
    });
    expect(clusteredRes.ok).toBe(true);
    if (clusteredRes.ok) {
      expect(clusteredRes.fullSource).toContain("rotate 90");
      expect(clusteredRes.fullSource).toContain("categories Q1, Q2");
      expect(clusteredRes.fullSource).toContain("series Москва : 120, 145");
      expect(clusteredRes.fullSource).toContain("series Регионы : 80, 95");
    }
  });
});

const PLANTUML_MINDMAP_WITH_CHROME = `@startmindmap
' комментарий
top to bottom direction
title Карта
header Шапка
footer Подвал
caption Подпись
<style>
mindmapDiagram {
  node {
    BackgroundColor lightBlue
  }
}
</style>
legend right
  * — OrgMode
  +/-- — арифметика
  _ — без рамки
endlegend

*[#1565C0] Старый корень
**:Многострочный узел
Редактор и превью
в одном окне;
' между узлами
left side
--[#E65100] Старая ветка
@endmindmap
`;

const MINDMAP_TABLE = "Корень\tВетка\tЛист\nКарта\tРаздел\tПункт";
const MINDMAP_TREE = "* Карта\n** Раздел\n*** Пункт";

function expectMindmapChromePreserved(source: string): void {
  expect(source).toContain("' комментарий");
  expect(source).toContain("top to bottom direction");
  expect(source).toContain("title Карта");
  expect(source).toContain("header Шапка");
  expect(source).toContain("footer Подвал");
  expect(source).toContain("caption Подпись");
  expect(source).toContain("<style>");
  expect(source).toContain("BackgroundColor lightBlue");
  expect(source).toContain("</style>");
  expect(source).toContain("legend right\n  * — OrgMode\n  +/-- — арифметика\n  _ — без рамки\nendlegend");
  expect(source).toContain("' между узлами");
  expect(source).toContain("left side");
  expect(source.startsWith("@startmindmap")).toBe(true);
  expect(source).toContain("@endmindmap");
  expect(source.indexOf("legend right")).toBeLessThan(source.indexOf("* Карта"));
  expect(source.indexOf("left side")).toBeLessThan(source.lastIndexOf("@endmindmap"));
}

describe("plantuml mindmap table paste", () => {
  it("replaces nodes and keeps legend, style, and other chrome", () => {
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(MINDMAP_TREE);
    expectMindmapChromePreserved(res.fullSource);
    expect(res.fullSource).not.toContain("Старый корень");
    expect(res.fullSource).not.toContain("Многострочный узел");
    expect(res.fullSource).not.toContain("Редактор и превью");
    expect(res.fullSource).not.toContain("Старая ветка");
    expect(res.fullSource.indexOf("* Карта")).toBeLessThan(res.fullSource.indexOf("left side"));
  });

  it("replaces all nodes when the caret sits inside a node label", () => {
    const cursorOffset = PLANTUML_MINDMAP_WITH_CHROME.indexOf("Старый корень");
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
      cursorOffset,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(MINDMAP_TREE);
    expectMindmapChromePreserved(res.fullSource);
    expect(res.fullSource).not.toContain("Старый корень");
  });

  it("does not inject nodes into the legend when the caret is on a legend line", () => {
    const cursorOffset = PLANTUML_MINDMAP_WITH_CHROME.indexOf("  * — OrgMode");
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
      cursorOffset,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(
      "legend right\n  * — OrgMode\n  +/-- — арифметика\n  _ — без рамки\nendlegend",
    );
    expect(res.fullSource.indexOf("endlegend")).toBeLessThan(res.fullSource.indexOf("* Карта"));
    expect(res.fullSource).not.toContain("Старый корень");
  });

  it("inserts the tree at a blank line inside the diagram and keeps existing nodes", () => {
    const cursorOffset =
      PLANTUML_MINDMAP_WITH_CHROME.indexOf("endlegend\n") + "endlegend\n".length;
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
      cursorOffset,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(MINDMAP_TREE);
    expect(res.fullSource).toContain("*[#1565C0] Старый корень");
    expect(res.fullSource).toContain("**:Многострочный узел");
    expect(res.fullSource).toContain("Редактор и превью");
    expectMindmapChromePreserved(res.fullSource);
    expect(res.fullSource.indexOf("* Карта")).toBeLessThan(
      res.fullSource.indexOf("*[#1565C0] Старый корень"),
    );
    expect(res.fullSource.indexOf("endlegend")).toBeLessThan(res.fullSource.indexOf("* Карта"));
  });

  it("inserts the tree just before @endmindmap when the caret is there", () => {
    const cursorOffset = PLANTUML_MINDMAP_WITH_CHROME.indexOf("@endmindmap");
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
      cursorOffset,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(`${MINDMAP_TREE}\n@endmindmap`);
    expect(res.fullSource).toContain("Старый корень");
    expect(res.fullSource).toContain("legend right");
  });

  it("replaces only the selected fragment", () => {
    const start = PLANTUML_MINDMAP_WITH_CHROME.indexOf("*[#1565C0] Старый корень");
    const end = PLANTUML_MINDMAP_WITH_CHROME.indexOf("' между узлами");
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
      selectionRange: { start, end },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(MINDMAP_TREE);
    expect(res.fullSource).not.toContain("Старый корень");
    expect(res.fullSource).not.toContain("Многострочный узел");
    expect(res.fullSource).toContain("--[#E65100] Старая ветка");
    expect(res.fullSource).toContain("' между узлами");
    expectMindmapChromePreserved(res.fullSource);
  });

  it("keeps legend when the whole buffer is selected", () => {
    const res = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: PLANTUML_MINDMAP_WITH_CHROME,
      format: "plantuml",
      selectionRange: { start: 0, end: PLANTUML_MINDMAP_WITH_CHROME.length },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) {
      return;
    }

    expect(res.fullSource).toContain(MINDMAP_TREE);
    expectMindmapChromePreserved(res.fullSource);
    expect(res.fullSource).not.toContain("Старый корень");
    expect(res.fullSource).not.toContain("Старая ветка");
  });

  it("still replaces a mermaid mindmap and a plantuml wbs as data sections", () => {
    const mermaidRes = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: "mindmap\n  root((Old))\n    Old branch",
      format: "mermaid",
    });
    expect(mermaidRes.ok).toBe(true);
    if (mermaidRes.ok) {
      expect(mermaidRes.fullSource).toContain("mindmap");
      expect(mermaidRes.fullSource).toContain("root((Карта))");
      expect(mermaidRes.fullSource).not.toContain("Old");
    }

    const wbsRes = applyTableFromClipboardText({
      clipboardText: MINDMAP_TABLE,
      source: "@startwbs\n* Old\n@endwbs",
      format: "plantuml",
    });
    expect(wbsRes.ok).toBe(true);
    if (wbsRes.ok) {
      expect(wbsRes.fullSource).toContain("* Карта\n** Раздел\n*** Пункт");
      expect(wbsRes.fullSource).not.toContain("* Old");
      expect(wbsRes.fullSource).toContain("@startwbs");
      expect(wbsRes.fullSource).toContain("@endwbs");
    }
  });
});

describe("mermaid gantt table paste", () => {
  const ganttSource = [
    "gantt",
    "title План релиза",
    "dateFormat YYYY-MM-DD",
    "excludes weekends",
    "",
    "section Старое",
    "Черновик :old, 2024-01-01, 2d",
  ].join("\n");

  it("keeps the first task when its name looks like a column title", () => {
    const res = applyTableFromClipboardText({
      clipboardText: [
        "Задача 1\t2026-01-06\t3\tЭтапы",
        "Задача 2\t2026-01-09\t5\tЭтапы",
        "Этап подготовки\t2026-01-14\t2\tЭтапы",
      ].join("\n"),
      source: ganttSource,
      format: "mermaid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.fullSource).toContain("title План релиза");
    expect(res.fullSource).toContain("dateFormat YYYY-MM-DD");
    expect(res.fullSource).toContain("section Этапы");
    expect(res.fullSource).toContain("Задача 1 :t1, 2026-01-06, 3d");
    expect(res.fullSource).toContain("Задача 2 :t2, 2026-01-09, 5d");
    expect(res.fullSource).toContain("Этап подготовки :t3, 2026-01-14, 2d");
    expect(res.fullSource).not.toContain("Черновик");
    expect(res.fullSource).not.toContain("section Старое");
  });

  it("drops a title row and column headers that are not task data", () => {
    const res = applyTableFromClipboardText({
      clipboardText: [
        "План релиза",
        "Название\tСтарт\tСрок\tГруппа",
        "Дизайн\t2026-01-06\t5\tПодготовка",
        "Код\t06.01.2026\t4 дня\tРазработка",
      ].join("\n"),
      source: ganttSource,
      format: "mermaid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.fullSource).toContain("section Подготовка");
    expect(res.fullSource).toContain("Дизайн :t1, 2026-01-06, 5d");
    expect(res.fullSource).toContain("section Разработка");
    expect(res.fullSource).toContain("Код :t2, 06.01.2026, 4 дня");
    expect(res.fullSource).not.toContain("Название :");
    expect(res.fullSource).not.toContain("План релиза :");
    expect(res.fullSource).not.toContain("section Группа");
  });

  it("drops recognized headers and keeps every task in a two-column sheet", () => {
    const res = applyTableFromClipboardText({
      clipboardText: ["Task\tDuration", "Design\t3d", "Build\t5"].join("\n"),
      source: "gantt\ndateFormat YYYY-MM-DD",
      format: "mermaid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.fullSource).toContain("Design :t1, 2026-01-01, 3d");
    expect(res.fullSource).toContain("Build :t2, after t1, 5d");
    expect(res.fullSource).not.toContain("Task :");
    expect(res.fullSource).not.toContain("Duration");
  });

  it("does not turn a task with a blank duration into a header", () => {
    const res = applyTableFromClipboardText({
      clipboardText: [
        "Согласование\t\t\tПодготовка",
        "Дизайн\t2026-01-06\t4\tПодготовка",
      ].join("\n"),
      source: "gantt\ndateFormat YYYY-MM-DD",
      format: "mermaid",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.fullSource).toContain("Согласование :t1, 2026-01-01, 3d");
    expect(res.fullSource).toContain("Дизайн :t2, 2026-01-06, 4d");
  });
});

describe("plantuml gantt table paste", () => {
  it("keeps a first task whose name contains a header word and drops the header row", () => {
    const res = applyTableFromClipboardText({
      clipboardText: [
        "Задача\tНачало\tДлительность",
        "Этап подготовки\t2026-01-06\t4",
        "Сборка\t2026-01-10\t2",
      ].join("\n"),
      source: "@startgantt\n[Черновик] lasts 1 days\n@endgantt",
      format: "plantuml",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.fullSource).toContain("[Этап подготовки] lasts 4 days");
    expect(res.fullSource).toContain("[Этап подготовки] starts 2026-01-06");
    expect(res.fullSource).toContain("[Сборка] lasts 2 days");
    expect(res.fullSource).not.toContain("[Задача]");
    expect(res.fullSource).not.toContain("[Черновик]");
  });
});
