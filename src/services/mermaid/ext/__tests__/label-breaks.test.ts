import { describe, expect, it } from "vitest";
import { boxplotEngine, type BoxplotModel } from "../engines/boxplot";
import { bubbleEngine, type BubbleModel } from "../engines/bubble";
import { clusteredEngine, type ClusteredModel } from "../engines/clustered";
import { evEngine, type EvModel } from "../engines/ev";
import { heatmapEngine, type HeatmapModel } from "../engines/heatmap";
import { radarEngine, type RadarModel } from "../engines/radar";
import { treemapEngine, type TreemapModel } from "../engines/treemap";
import { voronoiEngine, type VoronoiModel } from "../engines/voronoi";
import { waterfallEngine, type WaterfallModel } from "../engines/waterfall";

function svgHeight(svg: string): number {
  return Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)?.[1] ?? 0);
}

function textLines(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
}

describe("перенос подписей через \\n", () => {
  it("waterfall рисует колонку в две строки и растит холст", () => {
    const single = waterfallEngine.render(
      waterfallEngine.parse("waterfall\n=10 : Q1\n=20 : Q2").value as WaterfallModel,
      {},
    );
    const wrapped = waterfallEngine.render(
      waterfallEngine.parse("waterfall\n=10 : Q1\\nянварь\n=20 : Q2").value as WaterfallModel,
      {},
    );
    expect(textLines(wrapped)).toEqual(expect.arrayContaining(["Q1", "январь", "Q2"]));
    expect(svgHeight(wrapped)).toBeGreaterThan(svgHeight(single));
  });

  it("bubble переносит имя точки по \\n", () => {
    const source = `bubble
x "x" 0 --> 10
y "y" 0 --> 10
data
"Альфа\\nБета" : x=2, y=3, size=10`;
    const svg = bubbleEngine.render(bubbleEngine.parse(source).value as BubbleModel, {});
    expect(textLines(svg)).toEqual(expect.arrayContaining(["Альфа", "Бета"]));
  });

  it("heatmap переносит подпись колонки и строки", () => {
    const single = heatmapEngine.render(
      heatmapEngine.parse("heatmap\nx Пн, Вт\ny Утро\ndata\nУтро : 1, 2").value as HeatmapModel,
      {},
    );
    const wrapped = heatmapEngine.render(
      heatmapEngine.parse('heatmap\nx "Пн\\nутро", Вт\ny "Смена\\nА"\ndata\n"Смена\\nА" : 1, 2').value as HeatmapModel,
      {},
    );
    expect(textLines(wrapped)).toEqual(expect.arrayContaining(["Пн", "утро", "Смена", "А"]));
    expect(svgHeight(wrapped)).toBeGreaterThan(svgHeight(single));
  });

  it("ev переносит подпись дня", () => {
    const single = evEngine.render(
      evEngine.parse("ev\ndays Д1, Д2\npv 1, 2\nev 1, 2\nac 1, 2").value as EvModel,
      {},
    );
    const wrapped = evEngine.render(
      evEngine.parse('ev\ndays "Д1\\nпн", Д2\npv 1, 2\nev 1, 2\nac 1, 2').value as EvModel,
      {},
    );
    expect(textLines(wrapped)).toEqual(expect.arrayContaining(["Д1", "пн", "Д2"]));
    expect(svgHeight(wrapped)).toBeGreaterThan(svgHeight(single));
  });

  it("boxplot переносит имя категории", () => {
    const single = boxplotEngine.render(
      boxplotEngine.parse("boxplot\nA : 10, 20, 30, 40, 50\nB : 10, 20, 30, 40, 50").value as BoxplotModel,
      {},
    );
    const wrapped = boxplotEngine.render(
      boxplotEngine.parse('boxplot\n"A\\nодин" : 10, 20, 30, 40, 50\nB : 10, 20, 30, 40, 50').value as BoxplotModel,
      {},
    );
    expect(textLines(wrapped)).toEqual(expect.arrayContaining(["A", "один", "B"]));
    expect(svgHeight(wrapped)).toBeGreaterThan(svgHeight(single));
  });

  it("treemap переносит имя листа", () => {
    const svg = treemapEngine.render(
      treemapEngine.parse('treemap\nlabels none\n"Облако\\nРФ" : 40\nСеть : 20').value as TreemapModel,
      {},
    );
    expect(textLines(svg)).toEqual(expect.arrayContaining(["Облако", "РФ"]));
  });

  it("radar переносит подпись оси", () => {
    const parsed = radarEngine.parse(
      'radar\naxes "Срок\\nдни", Качество, Цена\nseries План : 4, 6, 5',
    );
    expect(parsed.ok).toBe(true);
    const svg = radarEngine.render(parsed.value as RadarModel, {});
    expect(textLines(svg)).toEqual(expect.arrayContaining(["Срок", "дни", "Качество"]));
  });

  it("voronoi переносит имя точки", () => {
    const svg = voronoiEngine.render(
      voronoiEngine.parse('voronoi\ndata\n"Север\\nА" : x=1, y=2\nЮг : x=4, y=5').value as VoronoiModel,
      {},
    );
    expect(textLines(svg)).toEqual(expect.arrayContaining(["Север", "А", "Юг"]));
  });

  it("clustered переносит категорию и в вертикальном, и в повёрнутом виде", () => {
    const vertical = clusteredEngine.render(
      clusteredEngine.parse('clustered\ncategories "Кат\\n1", Кат2\nseries План : 4, 6').value as ClusteredModel,
      {},
    );
    const horizontal = clusteredEngine.render(
      clusteredEngine.parse('clustered\nrotate 90\ncategories "Кат\\n1", Кат2\nseries План : 4, 6').value as ClusteredModel,
      {},
    );
    expect(textLines(vertical)).toEqual(expect.arrayContaining(["Кат", "1", "Кат2"]));
    expect(textLines(horizontal)).toEqual(expect.arrayContaining(["Кат", "1", "Кат2"]));
  });
});
