import { describe, expect, it } from "vitest";
import { boxplotEngine, type BoxplotModel } from "../engines/boxplot";
import {
  assignCagrLanes,
  cagrEndpointInset,
  clusteredEngine,
  formatCagrNumber,
  type ClusteredModel,
} from "../engines/series";
import { radarEngine, type RadarModel } from "../engines/radar";
import { treemapEngine, type TreemapModel } from "../engines/treemap";
import { voronoiEngine, type VoronoiModel } from "../engines/voronoi";
import { tryRenderExtension } from "../index";
import { assertSvgInvariants } from "./svg-invariants";

function extractSvgSize(svg: string): { width: number; height: number } {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return { width: Number(m?.[1] ?? 0), height: Number(m?.[2] ?? 0) };
}

describe("boxplot engine", () => {
  it("parses explicit quantiles, raw sample values, and color options", () => {
    const parsed = boxplotEngine.parse(`boxplot
title Отклик сервисов, мс
y "мс" 0 --> 200
grid 50
colors box=#0969da outlier=#cf222e s2=#8250df
API шлюз : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182, color=#1f6feb
Платежи : values=25, 38, 42, 50, 58, 65, 72, 150
Поиск : 12, 24, 35, 52, 88`);

    expect(parsed.ok).toBe(true);
    expect(parsed.value?.items).toHaveLength(3);
    expect(parsed.value?.items[0].outliers).toEqual([165, 182]);
    expect(parsed.value?.items[1].median).toBeGreaterThan(40);

    const svg = boxplotEngine.render(parsed.value as BoxplotModel, {});
    assertSvgInvariants(svg, { minElements: 10, expectSize: extractSvgSize(svg) });
    expect(svg).toContain("#1f6feb");
    expect(svg).toContain("#8250df");
  });

  it("supports mono mode and rejects unordered quantiles", () => {
    const bad = boxplotEngine.parse(`boxplot
API : min=80, q1=30, median=40, q3=50, max=60`);
    expect(bad.ok).toBe(false);

    const monoParsed = boxplotEngine.parse(`boxplot
mono
A : 10, 20, 30, 40, 50`);
    expect(monoParsed.ok).toBe(true);
    const svg = boxplotEngine.render(monoParsed.value as BoxplotModel, { dark: true });
    assertSvgInvariants(svg, { minElements: 4, expectSize: extractSvgSize(svg) });
  });
});

describe("treemap engine", () => {
  it("parses hierarchical groups, colors, and renders squarified rectangles", () => {
    const parsed = treemapEngine.parse(`treemap
title ИТ-бюджет по направлениям
labels both
colors s1=#0969da s2=#8250df
Инфраструктура / Облако : 420 color=#1f6feb
Инфраструктура / Сеть : 180
Разработка / Бэкенд : 350
Разработка / Фронтенд : 250`);

    expect(parsed.ok).toBe(true);
    expect(parsed.value?.groups).toHaveLength(2);
    expect(parsed.value?.total).toBe(1200);

    const svg = treemapEngine.render(parsed.value as TreemapModel, {});
    assertSvgInvariants(svg, { minElements: 6, expectSize: extractSvgSize(svg) });
    expect(svg).toContain("#1f6feb");
    expect(svg).toContain("35%");
  });

  it("rejects non-positive weights", () => {
    const bad = treemapEngine.parse(`treemap
A : -10`);
    expect(bad.ok).toBe(false);
  });
});

describe("radar engine", () => {
  it("parses axes, scale, colors, and renders spider chart polygons", () => {
    const parsed = radarEngine.parse(`radar
title Оценка платформ
axes Скорость, Надёжность, Удобство, Безопасность, Экосистема
scale 0 --> 100
rings 5
fill 0.25
colors s1=#0969da s2=#2da44e
series Платформа А : 85, 90, 78, 88, 92
series Платформа Б : 72, 84, 92, 76, 80 color=#cf222e`);

    expect(parsed.ok).toBe(true);
    expect(parsed.value?.axes).toHaveLength(5);
    expect(parsed.value?.series).toHaveLength(2);

    const svg = radarEngine.render(parsed.value as RadarModel, {});
    assertSvgInvariants(svg, { minElements: 10, expectSize: extractSvgSize(svg) });
    expect(svg).toContain("#0969da");
    expect(svg).toContain("#cf222e");
  });

  it("rejects mismatched series value count or fewer than 3 axes", () => {
    expect(radarEngine.parse("radar\naxes A, B\nS : 1, 2").ok).toBe(false);
    expect(radarEngine.parse("radar\naxes A, B, C\nS : 1, 2").ok).toBe(false);
  });

  it("stretches the canvas to the requested ratio", () => {
    const source = "radar\naxes A, B, C\nseries One : 10, 20, 30";
    const plain = radarEngine.render(radarEngine.parse(source).value as RadarModel, {});
    const wide = radarEngine.render(
      radarEngine.parse(`radar\nratio 16x9\naxes A, B, C\nseries One : 10, 20, 30`).value as RadarModel,
      {},
    );
    const plainSize = extractSvgSize(plain);
    const wideSize = extractSvgSize(wide);
    expect(wideSize.width / wideSize.height).toBeGreaterThan(plainSize.width / plainSize.height);
    expect(wideSize.width / wideSize.height).toBeCloseTo(16 / 9, 1);
  });
});

describe("voronoi engine", () => {
  it("parses sites, groups, colors, and renders clipped Voronoi cells", () => {
    const parsed = voronoiEngine.parse(`voronoi
title Зоны доставки складов
x "Восток — Запад, км" 0 --> 100
y "Юг — Север, км" 0 --> 100
colors s1=#0969da s2=#2da44e
data
Север : x=48, y=82, group=Магистраль
Юг : x=52, y=18, group=Магистраль
Запад : x=20, y=50, group=Город, color=#f97316
Восток : x=82, y=54, group=Город`);

    expect(parsed.ok).toBe(true);
    expect(parsed.value?.sites).toHaveLength(4);

    const svg = voronoiEngine.render(parsed.value as VoronoiModel, {});
    assertSvgInvariants(svg, { minElements: 8, expectSize: extractSvgSize(svg) });
    expect(svg).toContain("data-cell=\"Север\"");
  });
});

describe("clustered bar chart engine (vertical & rotated 90°)", () => {
  const baseSource = `series
title Выручка по регионам
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 200
colors s1=#0969da s2=#8250df s3=#2da44e
series Москва : 120, 145, 160, 185
series Регионы : 80, 95, 115, 140
series Экспорт : 45, 55, 70, 90 color=#f97316`;

  it("renders vertical clustered bars by default and rotates 90 degrees with rotate 90", async () => {
    const verticalParsed = clusteredEngine.parse(baseSource);
    expect(verticalParsed.ok).toBe(true);
    expect(verticalParsed.value?.rotate90).toBe(false);

    const rotatedParsed = clusteredEngine.parse(`${baseSource}\nrotate 90`);
    expect(rotatedParsed.ok).toBe(true);
    expect(rotatedParsed.value?.rotate90).toBe(true);

    const svgVertical = clusteredEngine.render(verticalParsed.value as ClusteredModel, {});
    const svgRotated = clusteredEngine.render(rotatedParsed.value as ClusteredModel, {});

    assertSvgInvariants(svgVertical, { minElements: 14, expectSize: extractSvgSize(svgVertical) });
    assertSvgInvariants(svgRotated, { minElements: 14, expectSize: extractSvgSize(svgRotated) });

    // В вертикальном режиме у баров разный x внутри одного кластера, а в повернутом на 90° — разный y
    const bar00Vert = /<rect[^>]*x="([\d.]+)" y="([\d.]+)"[^>]*data-bar="0-0"/.exec(svgVertical);
    const bar01Vert = /<rect[^>]*x="([\d.]+)" y="([\d.]+)"[^>]*data-bar="0-1"/.exec(svgVertical);
    expect(Number(bar01Vert?.[1])).toBeGreaterThan(Number(bar00Vert?.[1]));

    const bar00Rot = /<rect[^>]*x="([\d.]+)" y="([\d.]+)"[^>]*data-bar="0-0"/.exec(svgRotated);
    const bar01Rot = /<rect[^>]*x="([\d.]+)" y="([\d.]+)"[^>]*data-bar="0-1"/.exec(svgRotated);
    expect(Number(bar00Rot?.[1])).toBe(Number(bar01Rot?.[1]));
    expect(Number(bar01Rot?.[2])).toBeGreaterThan(Number(bar00Rot?.[2]));

    // Проверка через точку входа tryRenderExtension
    const viaEntry = await tryRenderExtension(`${baseSource}\nrotate 90`);
    expect(viaEntry).toContain("<svg");
  });

  it("invert y flips the vertical category axis only together with rotate 90", () => {
    const barY = (svg: string, id: string): number =>
      Number(new RegExp(`<rect[^>]*y="([\\d.]+)"[^>]*data-bar="${id}"`).exec(svg)?.[1]);

    const rotated = clusteredEngine.parse(`${baseSource}\nrotate 90`);
    const inverted = clusteredEngine.parse(`${baseSource}\nrotate 90\ninvert y`);
    const reverted = clusteredEngine.parse(`${baseSource}\nrotate 90\ninvert vertical\ninvert y off`);
    expect(rotated.ok).toBe(true);
    expect(inverted.ok).toBe(true);
    expect(reverted.ok).toBe(true);
    expect(rotated.value?.invertY).toBe(false);
    expect(inverted.value?.invertY).toBe(true);
    expect(reverted.value?.invertY).toBe(false);

    const svgRotated = clusteredEngine.render(rotated.value as ClusteredModel, {});
    const svgInverted = clusteredEngine.render(inverted.value as ClusteredModel, {});
    expect(barY(svgRotated, "0-0")).toBeLessThan(barY(svgRotated, "3-0"));
    expect(barY(svgInverted, "0-0")).toBeGreaterThan(barY(svgInverted, "3-0"));
    expect(barY(svgInverted, "0-0")).toBeCloseTo(barY(svgRotated, "3-0"));

    const withLine = clusteredEngine.parse(`series
rotate 90
invert y
categories A, B
series S : 1, 2
line L : 3, 4`);
    expect(withLine.ok).toBe(true);
    const lineSvg = clusteredEngine.render(withLine.value as ClusteredModel, {});
    const points = /<polyline[^>]*points="([^"]+)"[^>]*data-line="0"/.exec(lineSvg)?.[1] ?? "";
    const ys = points.trim().split(/\s+/).map((pair) => Number(pair.split(",")[1]));
    expect(ys[0]).toBeGreaterThan(ys[1]);

    const vertical = clusteredEngine.parse(baseSource);
    const verticalInverted = clusteredEngine.parse(`${baseSource}\ninvert y`);
    expect(verticalInverted.value?.invertY).toBe(true);
    const svgVertical = clusteredEngine.render(vertical.value as ClusteredModel, {});
    const svgVerticalInverted = clusteredEngine.render(verticalInverted.value as ClusteredModel, {});
    expect(barY(svgVerticalInverted, "0-0")).toBe(barY(svgVertical, "0-0"));
    expect(barY(svgVerticalInverted, "3-0")).toBe(barY(svgVertical, "3-0"));

    const broken = clusteredEngine.parse(`${baseSource}\ninvert x`);
    expect(broken.ok).toBe(false);
    expect(broken.errors[0]?.message).toContain("invert y");
  });

  it("stacks series into one column and supports inverted mono", () => {
    const stacked = clusteredEngine.parse(`${baseSource}\nstacked`);
    expect(stacked.ok).toBe(true);
    expect(stacked.value?.stack).toBe(true);
    const svg = clusteredEngine.render(stacked.value as ClusteredModel, {});
    const bar00 = /<rect[^>]*x="([\d.]+)"[^>]*data-bar="0-0"/.exec(svg);
    const bar01 = /<rect[^>]*x="([\d.]+)"[^>]*data-bar="0-1"/.exec(svg);
    expect(bar00?.[1]).toBe(bar01?.[1]);
    const y0 = Number(/<rect[^>]*y="([\d.]+)"[^>]*data-bar="0-0"/.exec(svg)?.[1]);
    const y1 = Number(/<rect[^>]*y="([\d.]+)"[^>]*data-bar="0-1"/.exec(svg)?.[1]);
    expect(y0).not.toBeCloseTo(y1, 0);

    const mono = clusteredEngine.parse(`${baseSource.replace(/colors[^\n]*\n/, "").replace(/ color=#f97316/, "")}\nmono invert`);
    expect(mono.ok).toBe(true);
    expect(mono.value?.monoInvert).toBe(true);
    const monoSvg = clusteredEngine.render(mono.value as ClusteredModel, {});
    expect(monoSvg).toContain('fill="#1a1d21"');
    expect(monoSvg).not.toContain("#0969da");
  });

  it("рисует линию с пропуском и подписью справа, а cagr — в овале", () => {
    const parsed = clusteredEngine.parse(`series
categories 2022, 2023, 2024, 2025
series Выручка : 18.9, 29.8, 35.1, 41.3
cagr
cagr 1, 3, format="0.0%", prefix="CAGR: "
line План : 20, -, 40, 50 color=#111111 style=dash
series Прочее : 5, 6, 7, 8
cagr label="+30% p.a."`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.lines).toHaveLength(1);
    expect(model.lines[0]?.values).toEqual([20, null, 40, 50]);
    expect(model.lines[0]?.style).toBe("dash");
    expect(model.lines[0]?.color).toBe("#111111");
    expect(model.series[0]?.values[1]).toBe(29.8);
    expect(model.cagrs.map((mark) => [mark.seriesIndex, mark.from, mark.to, mark.prefix, mark.label])).toEqual([
      [0, 0, 3, undefined, undefined],
      [0, 0, 2, "CAGR: ", undefined],
      [1, 0, 3, undefined, "+30% p.a."],
    ]);

    const svg = clusteredEngine.render(model, {});
    const rotated = clusteredEngine.render({ ...model, rotate90: true }, {});
    expect(rotated).toContain('data-line-label="План"');
    expect(rotated).toContain('data-cagr-label="30%"');
    expect(svg).toContain('data-line-label="План"');
    expect(svg).toContain('stroke-dasharray="7 4"');
    const planLine = /<polyline[^>]*points="([^"]+)"[^>]*data-line="0"/.exec(svg);
    expect(planLine?.[1].trim().split(/\s+/)).toHaveLength(3);
    expect(svg).toContain('data-cagr-label="30%"');
    expect(svg).toContain('data-cagr-label="CAGR: ');
    expect(svg).toMatch(/data-cagr-label="CAGR: \d+\.\d%"/);
    expect(svg).toContain('data-cagr-label="+30% p.a."');
    expect(svg).toContain("<ellipse");
    expect(svg).toContain("ext-series-cagr-arrow");
  });

  it("ставит плюс из ± только у положительного CAGR", () => {
    expect(formatCagrNumber(1.2, "±0")).toBe("+1");
    expect(formatCagrNumber(0.193, "±0%")).toBe("+19%");
    expect(formatCagrNumber(0.193, "±0.0%")).toBe("+19.3%");
    expect(formatCagrNumber(-1.2, "±0")).toBe("-1");
    expect(formatCagrNumber(-0.193, "±0%")).toBe("-19%");
    expect(formatCagrNumber(-0.193, "±0.0%")).toBe("-19.3%");
    expect(formatCagrNumber(-0.193, "+0.0%")).toBe("-19.3%");
    expect(formatCagrNumber(-0.193, "±0.0%")).not.toContain("+");
  });

  it("держит непересекающиеся стрелки CAGR на одном уровне", () => {
    expect(assignCagrLanes([
      { from: 0, to: 2 },
      { from: 2, to: 3 },
      { from: 1, to: 3 },
    ])).toEqual([0, 0, 1]);

    const parsed = clusteredEngine.parse(`series
categories A, B, C, D
y "" 0 --> 20
series Ровно : 10, 10, 10, 10
cagr 1, 3
cagr 3, 4
cagr 2, 4`);
    expect(parsed.ok).toBe(true);
    const svg = clusteredEngine.render(parsed.value as ClusteredModel, {});
    const arrows = [...svg.matchAll(/<line\b([^>]*)>/g)].flatMap((match) => {
      const attrs = match[1] ?? "";
      const cagr = /data-cagr="([^"]+)"/.exec(attrs)?.[1];
      const y1 = Number(/y1="([\d.]+)"/.exec(attrs)?.[1]);
      return cagr ? [{ cagr, y1 }] : [];
    });
    const yOf = (id: string) => arrows.find((arrow) => arrow.cagr === id)?.y1;
    expect(yOf("0:1-3")).toBe(yOf("0:3-4"));
    expect((yOf("0:1-3") ?? 0) - (yOf("0:2-4") ?? 0)).toBeCloseTo(16);

    const lineOf = (id: string) => {
      const attrs = [...svg.matchAll(/<line\b([^>]*)>/g)]
        .map((match) => match[1] ?? "")
        .find((item) => item.includes(`data-cagr="${id}"`));
      return {
        x1: Number(/x1="([\d.]+)"/.exec(attrs ?? "")?.[1]),
        x2: Number(/x2="([\d.]+)"/.exec(attrs ?? "")?.[1]),
      };
    };
    const centerOf = (barId: string) => {
      const attrs = [...svg.matchAll(/<rect\b([^>]*)>/g)]
        .map((match) => match[1] ?? "")
        .find((item) => item.includes(`data-bar="${barId}"`));
      const x = Number(/x="([\d.]+)"/.exec(attrs ?? "")?.[1]);
      const width = Number(/width="([\d.]+)"/.exec(attrs ?? "")?.[1]);
      return x + width / 2;
    };
    const firstSpan = lineOf("0:1-3");
    expect(firstSpan.x1).toBeGreaterThan(centerOf("0-0"));
    expect(firstSpan.x2).toBeLessThan(centerOf("2-0"));
    expect(cagrEndpointInset(80, 20)).toBeCloseTo(7);
  });

  it("не рисует пропущенный бар и отвергает cagr на пустом слоте", () => {
    const parsed = clusteredEngine.parse(`series
categories A, B, C
series Ряд : 10, -, 30`);
    expect(parsed.ok).toBe(true);
    const svg = clusteredEngine.render(parsed.value as ClusteredModel, {});
    expect(svg).not.toContain('data-bar="1-0"');
    expect(svg).toContain('data-bar="0-0"');
    expect(svg).toContain('data-bar="2-0"');

    const broken = clusteredEngine.parse(`series
categories A, B, C
series Ряд : 10, -, 30
cagr 1, 2`);
    expect(broken.ok).toBe(false);
    expect(broken.errors[0]?.message).toContain("нет значения в баре 2");
  });

  it("режет шкалу разрывом и рисует горизонтальные линии уровня", () => {
    const parsed = clusteredEngine.parse(`series
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 1000
grid 100
break 200 --> 700 "разрыв шкалы"
line 160 "план"
line 900 "цель" color=#cf222e width=2 style=solid
series Факт : 120, 180, 860, 240
line План : 100, 140, 200, 220 style=dash`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.breaks).toEqual([{ after: 200, before: 700, label: "разрыв шкалы" }]);
    expect(model.thresholds.map((item) => [item.value, item.label, item.style, item.color])).toEqual([
      [160, "план", undefined, undefined],
      [900, "цель", "solid", "#cf222e"],
    ]);
    expect(model.lines).toHaveLength(1);
    expect(model.lines[0]?.label).toBe("План");

    const svg = clusteredEngine.render(model, {});
    const pieces = svg.match(/data-bar="2-0"/g) ?? [];
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(svg).toContain('data-break-zigzag="1"');
    expect(svg).toContain('data-break-label="1"');
    // 200 уже стоит на сетке, 700 схлопнулось с ним и подписывается отдельно.
    expect(svg).not.toContain('data-break-edge="after"');
    expect(svg).toContain('data-break-edge="before">700');
    const tick200 = Number(/<text x="[\d.]+" y="([\d.]+)"[^>]*>200<\/text>/.exec(svg)![1]);
    const upper700 = Number(
      /<text x="[\d.]+" y="([\d.]+)"[^>]*data-break-edge="before">700<\/text>/.exec(svg)![1],
    );
    expect(upper700).toBeLessThanOrEqual(tick200 - 11);
    expect(svg).toContain('data-threshold-line="1"');
    expect(svg).toContain('data-threshold-label="1"');
    expect(svg).toContain("план");
    expect(svg).toContain('data-line-label="План"');

    const rotated = clusteredEngine.render({ ...model, rotate90: true }, {});
    expect(rotated).toContain('data-break-zigzag="1"');
    expect(rotated).not.toContain('data-break-edge="after"');
    expect(rotated).toContain('data-break-edge="before">700');
    expect(rotated).toContain('data-threshold-line="1"');
    expect(rotated.match(/data-bar="2-0"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);

    const overlap = clusteredEngine.parse(`series
categories A, B
y "" 0 --> 100
break 10 --> 40
break 30 --> 60
series Ряд : 20, 80`);
    expect(overlap.ok).toBe(false);
    expect(overlap.errors[0]?.message).toContain("пересекаются");

    const offGrid = clusteredEngine.parse(`series
categories A, B
y "" 0 --> 100
grid 10
break 25 --> 73
series Ряд : 20, 80`);
    const offGridSvg = clusteredEngine.render(offGrid.value as ClusteredModel, {});
    expect(offGridSvg).toContain('data-break-edge="after">25');
    expect(offGridSvg).toContain('data-break-edge="before">73');

    const reversed = clusteredEngine.parse(`series
categories A, B
break 40 --> 10
series Ряд : 20, 80`);
    expect(reversed.ok).toBe(false);
    expect(reversed.errors[0]?.message).toContain("должно быть больше");
  });

  it("строит вторую ось y2 для линий, серий и уровней со своей шкалой", () => {
    const parsed = clusteredEngine.parse(`series
title Выручка и конверсия
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 200
y2 "конверсия, %" 0 --> 40
series Выручка : 120, 145, 165, 190
line Конверсия : 12, 18, 24, 32 axis=y2 color=#8250df
line 30 "цель" axis=y2`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.y2).toEqual({ label: "конверсия, %", min: 0, max: 40 });
    expect(model.lines[0]?.axis).toBe("y2");
    expect(model.thresholds).toEqual([
      expect.objectContaining({ value: 30, label: "цель", axis: "y2" }),
    ]);

    const svg = clusteredEngine.render(model, {});
    expect(svg).toContain('data-axis-line="y2"');
    expect(svg).toContain('data-y2-label="1"');
    expect(svg).toContain('data-y2-tick="40"');
    expect(svg).toContain('data-axis="y2"');
    // Точка конверсии 32 из 40 — высоко на второй шкале, а не внизу основной (32 из 200).
    const points = /<polyline[^>]*points="([^"]+)"[^>]*data-line="0"/.exec(svg)?.[1] ?? "";
    const lastY = Number(points.trim().split(/\s+/).pop()?.split(",")[1]);
    const firstBarTop = Number(/<rect[^>]*y="([\d.]+)"[^>]*data-bar="0-0"/.exec(svg)?.[1]);
    expect(lastY).toBeLessThan(firstBarTop);
    expect(svg).toMatch(/data-threshold-line="1"[^>]*data-axis="y2"/);

    const rotated = clusteredEngine.render({ ...model, rotate90: true }, {});
    expect(rotated).toContain('data-axis-line="y2"');
    expect(rotated).toContain('data-y2-tick="40"');
    expect(rotated).toContain('data-y2-label="1"');
  });

  it("включает вторую ось по пометке axis=y2 без директивы и не пускает её ряды в основную шкалу", () => {
    const parsed = clusteredEngine.parse(`series
categories A, B
y "" 0 --> 100
series Большие : 80, 90
series Малые : 2, 3 axis=right`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.y2).toEqual({});
    expect(model.series[1]?.axis).toBe("y2");
    const svg = clusteredEngine.render(model, {});
    expect(svg).toMatch(/data-bar="0-1"[^>]*data-axis="y2"/);
    // Малые значения на своей шкале дают высокие бары, а не полоски у нуля основной.
    const smallTop = Number(/<rect[^>]*y="([\d.]+)"[^>]*data-bar="0-1"/.exec(svg)?.[1]);
    const bigTop = Number(/<rect[^>]*y="([\d.]+)"[^>]*data-bar="0-0"/.exec(svg)?.[1]);
    expect(smallTop).toBeLessThan(bigTop + 60);
  });

  it("отвергает неверную ось и бары второй оси в стопке", () => {
    const badAxis = clusteredEngine.parse(`series
categories A, B
series Ряд : 1, 2 axis=y3`);
    expect(badAxis.ok).toBe(false);
    expect(badAxis.errors[0]?.message).toContain("axis=y2");

    const badY2 = clusteredEngine.parse(`series
categories A, B
y2 "ось" 40 --> 10
series Ряд : 1, 2`);
    expect(badY2.ok).toBe(false);
    expect(badY2.errors[0]?.message).toContain("y2");

    const stacked = clusteredEngine.parse(`series
stacked
categories A, B
series Ряд : 1, 2 axis=y2`);
    expect(stacked.ok).toBe(false);
    expect(stacked.errors[0]?.message).toContain("stacked");
  });

  it("рисует серии и линии без названий и не ставит их в легенду", () => {
    const parsed = clusteredEngine.parse(`series
categories A, B, C
series : 10, 20, 30 color=#0969da
series Имя : 4, 5, 6
line : 8, 12, 16 style=dash color=#8250df
line План : 9, 11, 14`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.series.map((item) => item.name)).toEqual(["", "Имя"]);
    expect(model.series[0]?.color).toBe("#0969da");
    expect(model.lines.map((item) => item.label)).toEqual([undefined, "План"]);
    expect(model.lines[0]?.style).toBe("dash");

    const svg = clusteredEngine.render(model, {});
    expect(svg).toContain('data-bar="0-0"');
    expect(svg).toContain('data-bar="0-1"');
    expect(svg).toContain('data-line="0"');
    expect(svg).toContain('data-line-label="План"');
    expect(svg).toContain(">Имя<");
    expect(svg).not.toMatch(/data-line-label=""/);
    const legendNames = svg.match(/<text[^>]*>Имя<\/text>/g) ?? [];
    expect(legendNames.length).toBeGreaterThan(0);
  });

  it("разбирает скрытие осей, сетку y2, зазор, площади и сумму стопки", () => {
    const parsed = clusteredEngine.parse(`series
stacked area
gap 12%
categories A, B
y "v" 0 --> 40
axis x off
axis y off
grid
axis y2 off
grid y2 5
labels inside sum
series Один : 10, 20`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.area).toBe(true);
    expect(model.stack).toBe(true);
    expect(model.categoryAxis).toBe(false);
    expect(model.axis).toBe(false);
    expect(model.grid).toBe(true);
    expect(model.y2Axis).toBe(false);
    expect(model.y2Grid).toBe(true);
    expect(model.y2GridStep).toBe(5);
    expect(model.barGap).toEqual({ unit: "percent", value: 12 });
    expect(model.labels).toBe("inside");
    expect(model.showSum).toBe(true);

    const restored = clusteredEngine.parse(`series
categories A, B
axis y off
axis y on
series Один : 10, 20`);
    expect(restored.value?.axis).toBe(true);
    expect(restored.value?.grid).toBe(false);

    for (const source of ["gap -1", "gap 100%", "stacked ribbons"]) {
      const bad = clusteredEngine.parse(`series\ncategories A, B\n${source}\nseries Один : 1, 2`);
      expect(bad.ok, source).toBe(false);
    }
    expect(clusteredEngine.parse(`series\ncategories A\ngap 0\nseries Один : 1`).value?.barGap).toEqual({
      unit: "px",
      value: 0,
    });
  });

  it("прячет выбранную ось вместе с её линиями и рисует сетку y2 отдельно", () => {
    const source = `series
labels none
categories Альфа, Бета
y "основная" 0 --> 100
y2 "вторая" 0 --> 40
series Факт : 20, 40
line Доля : 10, 30 axis=y2`;
    const shown = clusteredEngine.render(
      clusteredEngine.parse(`${source}\ngrid y2 10`).value as ClusteredModel,
      {},
    );
    expect(shown).toMatch(/stroke-dasharray="6 4"[^>]*data-grid="y2"/);
    expect(shown).toContain('data-y2-tick="10"');
    expect(shown).toContain(">вторая<");
    expect(shown).toContain('stroke-dasharray="3 3"');

    const hidden = clusteredEngine.render(
      clusteredEngine.parse(`${source}\naxis y off\naxis y2 off\naxis x off`).value as ClusteredModel,
      {},
    );
    expect(hidden).not.toContain('stroke-dasharray="3 3"');
    expect(hidden).not.toContain('data-grid="y2"');
    expect(hidden).not.toContain("data-y2-tick");
    expect(hidden).not.toContain(">основная<");
    expect(hidden).not.toContain(">вторая<");
    expect(hidden).not.toContain(">Альфа<");
    expect(hidden).not.toContain(">20<");
    expect(hidden).toContain('data-bar="0-0"');

    const gridOnly = clusteredEngine.render(
      clusteredEngine.parse(`${source}\naxis y off\ngrid\naxis y2 off\ngrid y2`).value as ClusteredModel,
      {},
    );
    expect(gridOnly).toContain('stroke-dasharray="3 3"');
    expect(gridOnly).toContain('data-grid="y2"');
    expect(gridOnly).not.toContain(">20<");
    expect(gridOnly).not.toContain("data-y2-tick");
    expect(gridOnly).not.toContain('data-axis-zero="y2"');
  });

  it("ставит сумму над стопкой и пропускает нулевую", () => {
    const parsed = clusteredEngine.parse(`series
stacked
labels none sum
categories Плюс, Ноль
y "v" 0 --> 30
series П : 10, 4
series Q : 5, -4`);
    expect(parsed.ok).toBe(true);
    const svg = clusteredEngine.render(parsed.value as ClusteredModel, {});
    const sums = [...svg.matchAll(/data-stack-sum="1">([^<]*)</g)].map((match) => match[1]);
    expect(sums).toEqual(["15"]);
  });

  it("меняет просвет между барами пикселями и процентами", () => {
    const box = (svg: string, id: string) => {
      const tag = new RegExp(`<rect\\b[^>]*data-bar="${id}"[^>]*>`).exec(svg)?.[0] ?? "";
      const read = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(tag)?.[1]);
      return { x: read("x"), width: read("width") };
    };
    const render = (extra: string) =>
      clusteredEngine.render(
        clusteredEngine.parse(`series
categories А, Б
series П : 10, 12
series Q : 8, 9
${extra}`).value as ClusteredModel,
        {},
      );
    const plain = box(render(""), "0-1");
    const pixels = box(render("gap 18"), "0-1");
    const firstPlain = box(render(""), "0-0");
    const firstPixels = box(render("gap 18"), "0-0");
    expect(pixels.x - firstPixels.x).toBeCloseTo(firstPixels.width + 18, 5);
    expect(plain.x - firstPlain.x).toBeCloseTo(firstPlain.width + 3, 5);

    const stacked = (extra: string) =>
      clusteredEngine.render(
        clusteredEngine.parse(`series
stacked
categories А, Б
series П : 10, 12
${extra}`).value as ClusteredModel,
        {},
      );
    const near = box(stacked(""), "1-0").x - box(stacked(""), "0-0").x;
    const far = box(stacked("gap 80"), "1-0").x - box(stacked("gap 80"), "0-0").x;
    expect(far).toBeGreaterThan(near);
  });

  it("рисует площади при повороте и обрывает ленту на пропуске", () => {
    const parsed = clusteredEngine.parse(`series
stacked area
rotate 90
invert y
labels sum
categories А, Б, В
y "v" 0 --> 40
break 15 --> 25
line 30 "план"
series П : 10, -, 20
cagr
series Q : 4, 6, 8`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value as ClusteredModel;
    expect(model.area).toBe(true);
    expect(model.rotate90).toBe(true);
    expect(model.series[0]?.values[1]).toBeNull();
    const svg = clusteredEngine.render(model, {});
    expect(svg.match(/data-area="0"/g)).toHaveLength(2);
    expect(svg.match(/data-area="1"/g)).toHaveLength(1);
    expect(svg).toContain('data-stack-sum="1"');
    expect(svg).toContain("data-cagr=");
    expect(svg).toContain('data-break="1"');
    expect(svg).not.toContain("data-bar=");
  });

  it("labels fontcolor красит подпись контрастом или заданным цветом", () => {
    const fillOf = (svg: string, text: string) => {
      const tag = new RegExp(`<text\\b[^>]*>${text}</text>`).exec(svg)?.[0] ?? "";
      return /fill="([^"]+)"/.exec(tag)?.[1];
    };
    const source = `series
categories А
y "v" 0 --> 20
series Ряд : 7`;
    const plain = clusteredEngine.render(clusteredEngine.parse(source).value as ClusteredModel, {});
    const auto = clusteredEngine.parse(`${source}\nlabels above fontcolor auto`);
    expect(auto.value?.labelFontColor).toBe("auto");
    expect(auto.value?.labels).toBe("above");
    const light = clusteredEngine.render(auto.value as ClusteredModel, { background: "#ffffff" });
    const dark = clusteredEngine.render(auto.value as ClusteredModel, { background: "#111111" });
    expect(fillOf(plain, "7")).toBe("#656d76");
    expect(fillOf(light, "7")).toBe("#1f2328");
    expect(fillOf(dark, "7")).toBe("#e6edf3");

    const painted = clusteredEngine.parse(`${source}\nlabels fontcolor #cf222e`);
    expect(painted.value?.labelFontColor).toBe("#cf222e");
    expect(painted.value?.labels).toBe("above");
    const red = clusteredEngine.render(painted.value as ClusteredModel, {});
    expect(fillOf(red, "7")).toBe("#cf222e");
    expect(clusteredEngine.parse(`${source}\nlabels auto`).ok).toBe(false);

    const summed = clusteredEngine.parse(`series
stacked
labels none sum fontcolor auto
categories А
y "v" 0 --> 8
series П : 3
series Q : 2`);
    expect(summed.value?.showSum).toBe(true);
    expect(summed.value?.labelFontColor).toBe("auto");
    const sumSvg = clusteredEngine.render(summed.value as ClusteredModel, { background: "#111111" });
    expect(fillOf(sumSvg, "5")).toBe("#e6edf3");
  });
});
