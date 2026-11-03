import { describe, expect, it } from "vitest";
import { bubbleEngine, type BubbleModel } from "../engines/bubble";
import { checkFixturesForType } from "./fixtures.test";
import { assertSvgInvariants } from "./svg-invariants";

describe("bubble: фикстуры", () => {
  it("все фикстуры типа bubble разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("bubble", (src) => bubbleEngine.parse(src));
  });
});

describe("bubble: разбор", () => {
  it("читает оси, подпись размера и точки", () => {
    const r = bubbleEngine.parse(`bubble
title BCG матрица
x "Доля рынка" 0 --> 10
y "Рост рынка, %" 0 --> 30
size "Выручка"
data
Продукт A : x=8.2, y=22, size=340, group=Software
Продукт B : x=2.1, y=25, size=180`);
    expect(r.ok).toBe(true);
    const m = r.value as BubbleModel;
    expect(m.title).toBe("BCG матрица");
    expect(m.x.label).toBe("Доля рынка");
    expect(m.y.label).toBe("Рост рынка, %");
    expect(m.sizeLabel).toBe("Выручка");
    expect(m.points).toHaveLength(2);
    expect(m.points[0]).toMatchObject({
      label: "Продукт A",
      x: 8.2,
      y: 22,
      size: 340,
      group: "Software",
    });
    expect(m.points[1].group).toBeUndefined();
  });

  it("читает квадранты и линии раздела", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 10
quadrants Звёзды, Вопросы, Дойные коровы, Собаки
mid x=5 y=12
data
A : x=1, y=1, size=10`);
    expect(r.ok).toBe(true);
    const m = r.value as BubbleModel;
    expect(m.quadrants).toEqual(["Звёзды", "Вопросы", "Дойные коровы", "Собаки"]);
    expect(m.mid).toEqual({ x: 5, y: 12 });
  });

  it("без mid линии идут по середине диапазона", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 20
data
A : x=1, y=1, size=10`);
    expect(r.ok).toBe(true);
    expect((r.value as BubbleModel).mid).toEqual({ x: 5, y: 10 });
  });

  it("ошибка: нет оси x", () => {
    const r = bubbleEngine.parse(`bubble
y "Y" 0 --> 10
data
A : x=1, y=1, size=10`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ось «x»/i);
  });

  it("ошибка: нет блока data", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 10`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/блок «data»/i);
  });

  it("ошибка: пустой блок data", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 10
data`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/пуст/i);
  });

  it("ошибка: неизвестный ключ в точке", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 10
data
A : x=1, y=1, size=10, color=red`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/неизвестный ключ/i);
  });

  it("ошибка: не 4 квадранта", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 10
quadrants A, B, C
data
A : x=1, y=1, size=10`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/4 подписи квадрантов/i);
  });

  it("parse никогда не бросает исключение", () => {
    for (const src of ["", "bubble", "bubble\ndata", "bubble\nx \"\" 0 --> 0\ndata\nA : x=, y=, size="]) {
      expect(() => bubbleEngine.parse(src)).not.toThrow();
    }
  });
});

describe("bubble: рендер", () => {
  const src = `bubble
title Три точки
x "X" 0 --> 10
y "Y" 0 --> 10
size "Размер"
data
A : x=1, y=2, size=10
B : x=5, y=5, size=100
C : x=9, y=8, size=55`;

  it("возвращает SVG без width/height", () => {
    const r = bubbleEngine.parse(src);
    const svg = bubbleEngine.render(r.value as BubbleModel, {});
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
  });

  it("рисует по кругу на точку", () => {
    const r = bubbleEngine.parse(src);
    const svg = bubbleEngine.render(r.value as BubbleModel, {});
    expect((svg.match(/<circle/g) ?? []).length).toBe(3);
  });

  it("радиус в пределах [6, 40]", () => {
    const r = bubbleEngine.parse(src);
    const svg = bubbleEngine.render(r.value as BubbleModel, {});
    const radii = [...svg.matchAll(/<circle[^>]*\sr="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(radii).toHaveLength(3);
    for (const rad of radii) {
      expect(rad).toBeGreaterThanOrEqual(6);
      expect(rad).toBeLessThanOrEqual(40);
    }
    expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));
  });

  it("подписи точек попадают в SVG", () => {
    const r = bubbleEngine.parse(src);
    const svg = bubbleEngine.render(r.value as BubbleModel, {});
    for (const label of ["A", "B", "C"]) expect(svg).toContain(label);
  });

  it("квадранты рисуют 4 подписи", () => {
    const r = bubbleEngine.parse(`bubble
x "X" 0 --> 10
y "Y" 0 --> 10
quadrants Звёзды, Вопросы, Дойные коровы, Собаки
data
A : x=1, y=1, size=10`);
    const svg = bubbleEngine.render(r.value as BubbleModel, {});
    for (const q of ["Звёзды", "Вопросы", "Дойные коровы", "Собаки"]) expect(svg).toContain(q);
  });

  it("проходит общие инварианты SVG", () => {
    const r = bubbleEngine.parse(src);
    assertSvgInvariants(bubbleEngine.render(r.value as BubbleModel, {}), { minElements: 4 });
  });
});
