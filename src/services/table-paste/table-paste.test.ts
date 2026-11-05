import { describe, expect, it } from "vitest";
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
      expect(evRes.fullSource).toContain("days 1, 2");
      expect(evRes.fullSource).toContain("pv 10, 25");
      expect(evRes.fullSource).toContain("ev 8, 20");
      expect(evRes.fullSource).toContain("ac 12, 28");
    }

    const xyRes = applyTableFromClipboardText({
      clipboardText: "Месяц\tПлан\tФакт\nЯнв\t20\t18\nФев\t35\t30",
      source: "xychart-beta\n  title Заказы",
      format: "mermaid",
    });
    expect(xyRes.ok).toBe(true);
    if (xyRes.ok) {
      expect(xyRes.fullSource).toContain("x-axis [\"Янв\", \"Фев\"]");
      expect(xyRes.fullSource).toContain("bar [20, 35]");
      expect(xyRes.fullSource).toContain("line [18, 30]");
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

  it("parses orgchart, gantt, timeline, journey, packet, wbs, mindmap, nwdiag, and wiremark Table", () => {
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
