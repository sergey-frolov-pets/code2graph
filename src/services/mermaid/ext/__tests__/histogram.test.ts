import { describe, expect, it } from "vitest";
import { histogramEngine, type HistogramModel } from "../engines/histogram";
import {
  binIndex,
  fitDistribution,
  freedmanDiaconisCount,
  outlierFences,
  studentTCritical,
  summarize,
} from "../engines/histogram/stats";
import { assertSvgInvariants } from "./svg-invariants";

const SAMPLE = [12, 18, 22, 25, 28, 30, 33, 35, 38, 40, 42, 48, 55, 68];

function renderSize(svg: string): { width: number; height: number } {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return { width: Number(match?.[1] ?? 0), height: Number(match?.[2] ?? 0) };
}

describe("histogram statistics", () => {
  it("считает квантиль Стьюдента для df=10 и уровня 0.95", () => {
    const critical = studentTCritical(10, 0.95);
    expect(critical).toBeGreaterThan(2.2);
    expect(critical).toBeLessThan(2.26);
  });

  it("подбирает нормальное распределение по ММП и отличает его от выборочного sd", () => {
    const summary = summarize(SAMPLE);
    const fitted = fitDistribution("normal", SAMPLE);
    expect("params" in fitted).toBe(true);
    if (!("params" in fitted)) return;
    expect(fitted.params.mu).toBeCloseTo(summary.mean, 6);
    expect(fitted.params.sigma).toBeLessThan(summary.sd);
    expect(fitted.params.sigma).toBeGreaterThan(0);
  });

  it("отказывает логнормальному подбору на неположительном числе", () => {
    const fitted = fitDistribution("lognormal", [1, 2, 0, 4]);
    expect(fitted).toEqual({
      error: "логнормальное распределение требует положительные числа",
    });
  });

  it("восстанавливает форму Вейбулла по моментам", () => {
    const mean = 10;
    const variance = 20;
    const values = [mean, mean, mean + Math.sqrt(variance), mean - Math.sqrt(variance / 3)];
    const fitted = fitDistribution("weibull", values);
    expect("params" in fitted).toBe(true);
    if (!("params" in fitted) || fitted.params.shape === undefined || fitted.params.scale === undefined) {
      return;
    }
    expect(fitted.params.shape).toBeGreaterThan(0);
    expect(fitted.params.scale).toBeGreaterThan(0);
  });

  it("строит забор Тьюки и считает бины Фридмана–Диакониса", () => {
    const fences = outlierFences([1, 2, 3, 4, 5, 100], { method: "iqr", k: 1.5, action: "drop" });
    expect(fences).not.toBeNull();
    expect(fences!.high).toBeLessThan(100);
    expect(freedmanDiaconisCount(SAMPLE)).toBeGreaterThanOrEqual(1);
    expect(binIndex(10, [0, 10, 25, 80])).toBe(1);
    expect(binIndex(0, [0, 10, 25, 80])).toBe(0);
    expect(binIndex(80, [0, 10, 25, 80])).toBe(2);
    expect(binIndex(9.9, [0, 10, 25, 80])).toBe(0);
  });
});

describe("histogram engine", () => {
  it("рисует гистограмму с подбором, кривой, зазором и подписями", () => {
    const parsed = histogramEngine.parse(`histogram
title Задержка
x "мс" 0 --> 80
y "число"
bins auto
scale count
gap 0
labels above fontcolor auto
missing drop
errors drop
outliers iqr 1.5 drop
ci 0.95
stats mean median sd var ci
grid
colors mean=#cf222e s1=#0969da
series Наблюдения : 12, 18, , 22, na, oops, 30, 33, 35, 40, 42, 48, 55 color=#0969da
fit normal
curve normal mu=40 sigma=12 "эталон" color=#8250df`);

    expect(parsed.ok, parsed.errors.map((error) => error.message).join("; ")).toBe(true);
    const model = parsed.value as HistogramModel;
    expect(model.series[0].tokens.some((token) => token.kind === "missing")).toBe(true);
    expect(model.series[0].tokens.some((token) => token.kind === "error")).toBe(true);
    expect(model.curves).toHaveLength(2);
    const svg = histogramEngine.render(model, {});
    assertSvgInvariants(svg, { minElements: 8, expectSize: renderSize(svg) });
    expect(svg).toContain("#0969da");
    expect(svg).toContain("#8250df");
    expect(svg).toContain("mean");
  });

  it("принимает явные неравные интервалы и Вейбулла", () => {
    const parsed = histogramEngine.parse(`histogram
bins 0 --> 10, 10 --> 25, 25 --> 80
scale density
gap 1
labels inside
series A : 4, 8, 12, 18, 22, 30, 48
fit weibull
curve weibull shape=1.6 scale=28 "эталон"`);
    expect(parsed.ok, parsed.errors.map((error) => error.message).join("; ")).toBe(true);
    expect(parsed.value?.bins).toEqual({ mode: "edges", edges: [0, 10, 25, 80] });
    const svg = histogramEngine.render(parsed.value as HistogramModel, { dark: true });
    assertSvgInvariants(svg, { minElements: 4, expectSize: renderSize(svg) });
  });

  it("среднее и медиана идут по оси наблюдений и не ложатся на рамку", () => {
    const parsed = histogramEngine.parse(`histogram
title Latency
x "ms" 0 --> 80
y "count"
bins auto
stats mean median ci
colors mean=#cf222e median=#8250df
series Observations : 12, 18, 22, 25, 30, 28, 35, 40, 16, 21, 27, 33, 19, 24, 38, 14`);
    expect(parsed.ok).toBe(true);
    const svg = histogramEngine.render(parsed.value as HistogramModel, {});
    const mean = /<line\b([^>]*stroke-width="1\.75"[^>]*)\/?>/.exec(svg)?.[1];
    const median = /<line\b([^>]*stroke-width="1\.25"[^>]*)\/?>/.exec(svg)?.[1];
    expect(mean).toBeTruthy();
    expect(median).toBeTruthy();
    for (const attrs of [mean, median]) {
      const x1 = Number(/x1="([^"]+)"/.exec(attrs ?? "")?.[1]);
      const x2 = Number(/x2="([^"]+)"/.exec(attrs ?? "")?.[1]);
      const y1 = Number(/y1="([^"]+)"/.exec(attrs ?? "")?.[1]);
      const y2 = Number(/y2="([^"]+)"/.exec(attrs ?? "")?.[1]);
      expect(x1).toBeCloseTo(x2, 3);
      expect(Math.abs(y2 - y1)).toBeGreaterThan(40);
    }
    const meanX = Number(/x1="([^"]+)"/.exec(mean ?? "")?.[1]);
    const medianX = Number(/x1="([^"]+)"/.exec(median ?? "")?.[1]);
    expect(Math.abs(meanX - medianX)).toBeGreaterThan(0.5);
  });

  it("длинная легенда переносится на следующую строку", () => {
    const parsed = histogramEngine.parse(`histogram
series "Очень длинное имя первой выборки" : 1, 2, 3, 4, 8, 9
series "Вторая ещё более длинная подпись ряда" : 2, 3, 4, 5, 6, 7
fit normal
curve normal mu=4 sigma=1 "эталонная кривая распределения"`);
    expect(parsed.ok, parsed.errors.map((error) => error.message).join("; ")).toBe(true);
    const svg = histogramEngine.render(parsed.value as HistogramModel, {});
    const rows = new Set(
      [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
        .filter((match) => /выборки|подписи|эталонная|fit normal/.test(match[2]))
        .map((match) => / y="([^"]+)"/.exec(match[1])?.[1]),
    );
    expect(rows.size).toBeGreaterThan(1);
  });

  it("шкала плотности следует за pdf, а не за диапазоном 0…1", () => {
    const parsed = histogramEngine.parse(`histogram
title Плотность
x "мс" 0 --> 80
y "плотность"
bins 8
scale density
labels none
fit normal
series Наблюдения : 12, 18, 22, 25, 30, 28, 35, 40, 16, 21, 27, 33, 19, 24, 38, 14`);
    expect(parsed.ok, parsed.errors.map((error) => error.message).join("; ")).toBe(true);
    const svg = histogramEngine.render(parsed.value as HistogramModel, {});
    const ticks = [...svg.matchAll(/<text\b[^>]*text-anchor="end"[^>]*>([^<]*)<\/text>/g)].map(
      (match) => Number(match[1]),
    );
    const top = Math.max(...ticks.filter((value) => Number.isFinite(value)));
    expect(top).toBeGreaterThan(0.02);
    expect(top).toBeLessThan(0.2);
    const axis = [...svg.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="\1" y2="([^"]+)"([^/]*)\/>/g)]
      .map((match) => ({
        span: Math.abs(Number(match[3]) - Number(match[2])),
        dashed: match[4].includes("stroke-dasharray"),
      }))
      .find((line) => !line.dashed && line.span > 40);
    const bars = [...svg.matchAll(/<rect\b[^>]*height="([^"]+)"[^>]*opacity="0\.78"/g)].map((match) =>
      Number(match[1]),
    );
    expect(axis).toBeTruthy();
    expect(Math.max(...bars) / (axis?.span ?? 1)).toBeGreaterThan(0.45);
  });

  it("подписи above при повороте стоят за торцом столбца", () => {
    const parsed = histogramEngine.parse(`histogram
rotate 90
labels above
bins 3
stats mean
series A : 12, 18, 22, 25, 30, 28, 35, 40, 16, 21, 27, 33, 19, 24, 38, 14`);
    expect(parsed.ok, parsed.errors.map((error) => error.message).join("; ")).toBe(true);
    const svg = histogramEngine.render(parsed.value as HistogramModel, {});
    const bars = [
      ...svg.matchAll(
        /<rect x="([^"]+)" y="[^"]+" width="([^"]+)" height="[^"]+"[^>]*opacity="0\.78"\/><text x="([^"]+)"[^>]*text-anchor="([^"]+)"[^>]*>/g,
      ),
    ];
    expect(bars.length).toBeGreaterThan(0);
    for (const match of bars) {
      const tip = Number(match[1]) + Number(match[2]);
      expect(match[4]).toBe("start");
      expect(Number(match[3])).toBeGreaterThan(tip + 1);
    }
    const viewBox = /viewBox="0 0 ([\d.]+) /.exec(svg);
    const labelRight = Math.max(
      ...bars.map((match) => {
        const text = new RegExp(
          `<text x="${match[3]}"[^>]*>([^<]*)</text>`,
        ).exec(svg);
        return Number(match[3]) + (text?.[1].length ?? 1) * 6;
      }),
    );
    expect(labelRight).toBeLessThan(Number(viewBox?.[1] ?? 0));
  });

  it("не смешивает явные интервалы с числом бинов", () => {
    const parsed = histogramEngine.parse(`histogram
bins 20
binwidth 5
series A : 1, 2, 3, 4`);
    expect(parsed.ok).toBe(false);
  });

  it("считает ошибку разбора при errors fail", () => {
    const parsed = histogramEngine.parse(`histogram
errors fail
series A : 1, oops, 3`);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]?.message).toContain("oops");
  });
});
