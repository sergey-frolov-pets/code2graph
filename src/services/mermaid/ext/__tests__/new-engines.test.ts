import { describe, expect, it } from "vitest";
import { boxplotEngine, type BoxplotModel } from "../engines/boxplot";
import { clusteredEngine, type ClusteredModel } from "../engines/clustered";
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
    expect(svg).toContain('data-cagr-label="30%"');
    expect(svg).toContain('data-cagr-label="CAGR: ');
    expect(svg).toMatch(/data-cagr-label="CAGR: \d+\.\d%"/);
    expect(svg).toContain('data-cagr-label="+30% p.a."');
    expect(svg).toContain("<ellipse");
    expect(svg).toContain("ext-series-cagr-arrow");
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
});
