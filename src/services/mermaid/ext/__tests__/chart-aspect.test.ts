import { describe, expect, it } from "vitest";
import { bubbleEngine } from "../engines/bubble";
import { waterfallEngine } from "../engines/waterfall";
import { clusteredEngine } from "../engines/series";
import { growPlotToAspect, parseAspectDirective } from "../chart-aspect";

function svgBox(svg: string): { width: number; height: number } {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!match) throw new Error("svg without viewBox");
  return { width: Number(match[1]), height: Number(match[2]) };
}

const BUBBLE = `bubble
x "X" 0 --> 10
y "Y" 0 --> 10
data
A : x=2, y=3, size=10
B : x=8, y=7, size=40`;

const WATERFALL = `waterfall
=1200 : Начало
+350 : Рост
-800 : Падение`;

describe("parseAspectDirective", () => {
  it("читает 16x9, 4:3, 16/9 и кириллическую х", () => {
    expect(parseAspectDirective("ratio 16x9")).toEqual({ aspect: { width: 16, height: 9 } });
    expect(parseAspectDirective("aspect 4:3")).toEqual({ aspect: { width: 4, height: 3 } });
    expect(parseAspectDirective("ratio 16/9")).toEqual({ aspect: { width: 16, height: 9 } });
    expect(parseAspectDirective("ratio 4х3")).toEqual({ aspect: { width: 4, height: 3 } });
  });

  it("не трогает другие директивы и отклоняет мусор", () => {
    expect(parseAspectDirective("title Отчёт")).toBeNull();
    expect(parseAspectDirective("ratio")).toEqual({
      error: expect.stringContaining("ratio 16x9"),
    });
    const stretched = parseAspectDirective("ratio 100x1");
    expect(stretched && "error" in stretched ? stretched.error : "").toContain("вытянут");
  });
});

describe("growPlotToAspect", () => {
  it("расширяет ширину поля, если холст уже запрошенных пропорций", () => {
    const grown = growPlotToAspect(
      { plotWidth: 200, plotHeight: 200, totalWidth: 280, totalHeight: 280 },
      { width: 16, height: 9 },
    );
    expect(grown.plotHeight).toBe(200);
    expect(grown.plotWidth).toBeGreaterThan(200);
    const width = 80 + grown.plotWidth;
    const height = 80 + grown.plotHeight;
    expect(width / height).toBeCloseTo(16 / 9, 5);
  });
});

describe("графики растягиваются под ratio", () => {
  it("пузырьковая область занимает кадр 16x9", () => {
    const plain = bubbleEngine.render(bubbleEngine.parse(BUBBLE).value!, {});
    const wide = bubbleEngine.render(bubbleEngine.parse(`${BUBBLE.replace("data", "ratio 16x9\ndata")}`).value!, {});
    const plainBox = svgBox(plain);
    const wideBox = svgBox(wide);

    expect(wideBox.width / wideBox.height).toBeCloseTo(16 / 9, 1);
    expect(wideBox.width).toBeGreaterThan(plainBox.width);
    expect(wideBox.height).toBeGreaterThanOrEqual(plainBox.height - 1);
  });

  it("бары водопада становятся шире в кадре 16x9", () => {
    const plainModel = waterfallEngine.parse(WATERFALL);
    const wideModel = waterfallEngine.parse(`waterfall\nratio 16x9\n=1200 : Начало\n+350 : Рост\n-800 : Падение`);
    expect(plainModel.ok).toBe(true);
    expect(wideModel.ok).toBe(true);
    const plain = waterfallEngine.render(plainModel.value!, {});
    const wide = waterfallEngine.render(wideModel.value!, {});
    const bar = (svg: string) => {
      const match = /<rect\b([^>]*\sdata-bar="[^"]*"[^>]*)\/>/.exec(svg);
      const attrs = match?.[1] ?? "";
      return {
        width: Number(/\swidth="([\d.]+)"/.exec(attrs)?.[1]),
        height: Number(/\sheight="([\d.]+)"/.exec(attrs)?.[1]),
      };
    };

    expect(svgBox(wide).width / svgBox(wide).height).toBeCloseTo(16 / 9, 1);
    const plainBar = bar(plain);
    const wideBar = bar(wide);
    expect(wideBar.width * wideBar.height).toBeGreaterThan(plainBar.width * plainBar.height);
  });

  it("столбцы clustered занимают кадр 4x3", () => {
    const parsed = clusteredEngine.parse(`series\nratio 4x3\ncategories A, B, C\nseries Один : 10, 20, 15`);
    expect(parsed.ok).toBe(true);
    const svg = clusteredEngine.render(parsed.value!, {});
    const box = svgBox(svg);
    expect(box.width / box.height).toBeCloseTo(4 / 3, 1);
  });

  it("неизвестный ratio в bubble — ошибка разбора", () => {
    const parsed = bubbleEngine.parse(`${BUBBLE.replace("data", "ratio wide\ndata")}`);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]?.message).toContain("ratio 16x9");
  });
});
