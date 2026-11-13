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
