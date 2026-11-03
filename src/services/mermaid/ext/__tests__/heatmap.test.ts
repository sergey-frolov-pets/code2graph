import { describe, expect, it } from "vitest";
import { heatmapEngine } from "../engines/heatmap";
import { checkFixturesForType } from "./fixtures.test";

describe("heatmap: фикстуры", () => {
  it("все фикстуры типа heatmap разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("heatmap", (src) => heatmapEngine.parse(src));
  });
});

describe("heatmap: разбор", () => {
  it("читает оси, шкалу и матрицу", () => {
    const r = heatmapEngine.parse(`heatmap
title Нагрузка по дням
x Пн, Вт, Ср
y Утро, День
scale
0-40 : #e8f5e9
40+ : #ffebee
data
Утро : 20, 35, 50
День : 60, 75, 85`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.title).toBe("Нагрузка по дням");
    expect(m.x).toEqual(["Пн", "Вт", "Ср"]);
    expect(m.y).toEqual(["Утро", "День"]);
    expect(m.scale).toHaveLength(2);
    expect(m.scale[0]).toMatchObject({ from: 0, to: 40, color: "#e8f5e9" });
    expect(m.scale[1]).toMatchObject({ from: 40, to: null, color: "#ffebee" });
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0]).toMatchObject({ label: "Утро", values: [20, 35, 50] });
  });

  it("без scale ставит встроенную шкалу", () => {
    const r = heatmapEngine.parse(`heatmap
x A, B
y R
data
R : 1, 100`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.scale.length).toBeGreaterThanOrEqual(3);
    expect(m.scaleAuto).toBe(true);
  });

  it("пустая ячейка трактуется как null", () => {
    const r = heatmapEngine.parse(`heatmap
x A, B, C
y R
data
R : 20,,35`);
    expect(r.ok).toBe(true);
    expect((r.value as any).rows[0].values).toEqual([20, null, 35]);
  });

  it("ошибка: нет подписей x", () => {
    const r = heatmapEngine.parse(`heatmap
y R
data
R : 1`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ось «x»/i);
  });

  it("ошибка: нет блока data", () => {
    const r = heatmapEngine.parse(`heatmap
x A, B
y R`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/блок «data»/i);
  });

  it("ошибка: несовпадение длины строки", () => {
    const r = heatmapEngine.parse(`heatmap
x A, B, C
y R1
data
R1 : 1, 2`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ожидается 3 значений/i);
  });

  it("ошибка: строка не из списка y", () => {
    const r = heatmapEngine.parse(`heatmap
x A, B
y R1
data
R2 : 1, 2`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/отсутствует в списке/i);
  });

  it("ошибка: пересечение диапазонов шкалы", () => {
    const r = heatmapEngine.parse(`heatmap
x A
y R
scale
0-50 : #fff
40+ : #000
data
R : 10`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/пересекаются|не покрывает/i);
  });

  it("parse никогда не бросает исключение", () => {
    for (const src of ["", "heatmap", "heatmap\nscale", "heatmap\nx A\ny R\ndata\nR : "]) {
      expect(() => heatmapEngine.parse(src)).not.toThrow();
    }
  });
});

describe("heatmap: рендер", () => {
  const src = `heatmap
title Нагрузка
x Пн, Вт, Ср
y Утро, День
scale
0-40 : #e8f5e9
40+ : #ffebee
data
Утро : 20, 35, 50
День : 60, 75, 85`;

  it("возвращает SVG без width/height", () => {
    const r = heatmapEngine.parse(src);
    const svg = heatmapEngine.render(r.value as any, {});
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
  });

  it("рисует по прямоугольнику на ячейку", () => {
    const r = heatmapEngine.parse(src);
    const svg = heatmapEngine.render(r.value as any, {});
    expect((svg.match(/<rect/g) ?? []).length).toBe(6);
  });

  it("применяет цвета шкалы", () => {
    const r = heatmapEngine.parse(src);
    const svg = heatmapEngine.render(r.value as any, {});
    expect(svg).toContain("#e8f5e9");
    expect(svg).toContain("#ffebee");
  });

  it("подписи осей попадают в SVG", () => {
    const r = heatmapEngine.parse(src);
    const svg = heatmapEngine.render(r.value as any, {});
    for (const label of ["Пн", "Вт", "Ср", "Утро", "День"]) expect(svg).toContain(label);
  });

  it("null-ячейка рисуется серой", () => {
    const r = heatmapEngine.parse(`heatmap
x A, B
y R
data
R : 10,,30`);
    const svg = heatmapEngine.render(r.value as any, {});
    expect((svg.match(/<rect/g) ?? []).length).toBe(2);
  });
});
