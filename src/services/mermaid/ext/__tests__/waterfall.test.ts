import { describe, expect, it } from "vitest";
import { waterfallEngine } from "../engines/waterfall";
import { checkFixturesForType } from "./fixtures.test";

describe("waterfall: фикстуры", () => {
  it("все фикстуры типа waterfall разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("waterfall", (src) => waterfallEngine.parse(src));
  });
});

describe("waterfall: разбор", () => {
  it("читает заголовок, ось и колонки", () => {
    const r = waterfallEngine.parse(`waterfall
title Выручка 2026
y "млн ₽" 0 --> 120
=40 : Q1
+15 : Q2
+20 : Q3
=75 : Итог`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.title).toBe("Выручка 2026");
    expect(m.axis.label).toBe("млн ₽");
    expect(m.axis.min).toBe(0);
    expect(m.axis.max).toBe(120);
    expect(m.series).toHaveLength(1);
    expect(m.series[0].steps).toHaveLength(4);
    expect(m.series[0].steps[0]).toMatchObject({ kind: "absolute", value: 40, label: "Q1" });
    expect(m.series[0].steps[1]).toMatchObject({ kind: "delta", value: 15, label: "Q2" });
    expect(m.series[0].steps[2]).toMatchObject({ kind: "delta", value: 20, label: "Q3" });
    expect(m.series[0].steps[3]).toMatchObject({ kind: "absolute", value: 75, label: "Итог" });
  });

  it("понимает отрицательное абсолютное значение", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : Начало
-25 : Падение
=-10 : Итог`);
    expect(r.ok).toBe(true);
    const steps = (r.value as any).series[0].steps;
    expect(steps[2]).toMatchObject({ kind: "absolute", value: -10 });
  });

  it("понимает тысячные разделители и дробные числа", () => {
    const r = waterfallEngine.parse(`waterfall
=1 200 : Старт
+12.5 : Рост
+1_000 : Ещё`);
    expect(r.ok).toBe(true);
    const steps = (r.value as any).series[0].steps;
    expect(steps[0].value).toBe(1200);
    expect(steps[1].value).toBe(12.5);
    expect(steps[2].value).toBe(1000);
  });

  it("строит несколько групп через series", () => {
    const r = waterfallEngine.parse(`waterfall-multi
series Базовый
=50 : Старт
+30 : Рост
series Оптимистичный
=50 : Старт
+45 : Рост`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.series).toHaveLength(2);
    expect(m.series[0].name).toBe("Базовый");
    expect(m.series[1].name).toBe("Оптимистичный");
  });

  it("считает шкалу автоматически, если y не задан", () => {
    const r = waterfallEngine.parse(`waterfall
=1200 : Начало
+350 : Рост
-800 : Падение
=750 : Итог`);
    expect(r.ok).toBe(true);
    const axis = (r.value as any).axis;
    expect(axis.auto).toBe(true);
    expect(axis.min).toBeLessThanOrEqual(0);
    expect(axis.max).toBeGreaterThanOrEqual(1550);
  });

  it("ошибка: нет данных", () => {
    const r = waterfallEngine.parse(`waterfall
title Пусто
y "млн ₽" 0 --> 100`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/нет данных/i);
  });

  it("ошибка: первая колонка не абсолютная", () => {
    const r = waterfallEngine.parse(`waterfall
+10 : A
=20 : B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/первая колонка/i);
    expect(r.errors[0].line).toBe(2);
  });

  it("ошибка: непарсящееся число", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : A
+abc : B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/число/i);
  });

  it("ошибка: нет двоеточия", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : A
+15 B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ожидается формат/i);
  });

  it("ошибка: series без данных", () => {
    const r = waterfallEngine.parse(`waterfall-multi
series Пустой
series Второй
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/не содержит данных/i);
  });

  it("parse никогда не бросает исключение", () => {
    for (const src of ["", "waterfall", "%% только коммент", "waterfall\n:::", "waterfall\n= : x"]) {
      expect(() => waterfallEngine.parse(src)).not.toThrow();
    }
  });
});

describe("waterfall: рендер", () => {
  it("возвращает SVG с viewBox и без width/height", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
=55 : Итог`);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as any, {});
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
    expect(svg).not.toMatch(/<svg[^>]*\sheight=/);
  });

  it("содержит подписи колонок", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
=55 : Итог`);
    const svg = waterfallEngine.render(r.value as any, {});
    expect(svg).toContain("Q1");
    expect(svg).toContain("Q2");
    expect(svg).toContain("Итог");
  });

  it("тёмная тема меняет палитру", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
=40 : Q2`);
    const light = waterfallEngine.render(r.value as any, { dark: false });
    const dark = waterfallEngine.render(r.value as any, { dark: true });
    expect(light).not.toBe(dark);
  });

  it("debugFrames добавляет обводку и data-атрибуты", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
=40 : Q2`);
    const svg = waterfallEngine.render(r.value as any, { debugFrames: true });
    expect(svg).toContain("data-debug");
  });

  it("в SVG нет контактов автора и внешних ссылок", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
=40 : Q2`);
    const svg = waterfallEngine.render(r.value as any, {});
    expect(svg).not.toMatch(/https?:\/\//);
    expect(svg).not.toMatch(/@/);
    expect(svg).not.toMatch(/<script/i);
  });
});
