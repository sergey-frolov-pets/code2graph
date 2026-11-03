import { describe, expect, it } from "vitest";
import { evEngine } from "../engines/ev";
import { checkFixturesForType } from "./fixtures.test";
import { assertSvgInvariants } from "./svg-invariants";

describe("ev: фикстуры", () => {
  it("все фикстуры типа ev разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("ev", (src) => evEngine.parse(src));
  });
});

describe("ev: разбор", () => {
  it("читает дни и три ряда", () => {
    const r = evEngine.parse(`ev
title Освоение бюджета
days 1, 2, 3
pv 10, 25, 45
ev 8, 20, 40
ac 12, 28, 50
grid`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.title).toBe("Освоение бюджета");
    expect(m.days).toEqual(["1", "2", "3"]);
    expect(m.pv).toEqual([10, 25, 45]);
    expect(m.ev).toEqual([8, 20, 40]);
    expect(m.ac).toEqual([12, 28, 50]);
    expect(m.grid).toBe(true);
  });

  it("grid по умолчанию выключен", () => {
    const r = evEngine.parse(`ev
days 1, 2
pv 1, 2
ev 1, 2
ac 1, 2`);
    expect(r.ok).toBe(true);
    expect((r.value as any).grid).toBe(false);
  });

  it("считает SV и CV на последнем периоде", () => {
    const r = evEngine.parse(`ev
days 1, 2
pv 10, 30
ev 8, 25
ac 12, 40`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.summary.sv).toBe(25 - 30);
    expect(m.summary.cv).toBe(25 - 40);
  });

  it("ошибка: нет days", () => {
    const r = evEngine.parse(`ev
pv 1, 2
ev 1, 2
ac 1, 2`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/«days»/i);
  });

  it("ошибка: нет ряда ac", () => {
    const r = evEngine.parse(`ev
days 1, 2
pv 1, 2
ev 1, 2`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ряд «ac»/i);
  });

  it("ошибка: разная длина рядов", () => {
    const r = evEngine.parse(`ev
days 1, 2, 3
pv 1, 2, 3
ev 1, 2
ac 1, 2, 3`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ожидается 3 значений/i);
  });

  it("ошибка: непарсящееся число", () => {
    const r = evEngine.parse(`ev
days 1, 2
pv 1, abc
ev 1, 2
ac 1, 2`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/число/i);
  });

  it("parse никогда не бросает исключение", () => {
    for (const src of ["", "ev", "ev\ndays", "ev\ndays 1\npv\nev\nac"]) {
      expect(() => evEngine.parse(src)).not.toThrow();
    }
  });
});

describe("ev: рендер", () => {
  const src = `ev
title Освоение бюджета
days 1, 2, 3, 4
pv 10, 25, 45, 65
ev 8, 20, 40, 58
ac 12, 28, 50, 72
grid`;

  it("возвращает SVG без width/height", () => {
    const r = evEngine.parse(src);
    const svg = evEngine.render(r.value as any, {});
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
  });

  it("рисует три полилинии", () => {
    const r = evEngine.parse(src);
    const svg = evEngine.render(r.value as any, {});
    expect((svg.match(/<polyline|<path/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("подписи дней попадают в SVG", () => {
    const r = evEngine.parse(src);
    const svg = evEngine.render(r.value as any, {});
    for (const day of ["1", "2", "3", "4"]) expect(svg).toContain(`>${day}<`);
  });

  it("легенда содержит PV, EV, AC", () => {
    const r = evEngine.parse(src);
    const svg = evEngine.render(r.value as any, {});
    expect(svg).toContain("PV");
    expect(svg).toContain("EV");
    expect(svg).toContain("AC");
  });

  it("grid добавляет линии сетки, без grid — нет", () => {
    const withGrid = evEngine.parse(src);
    const withoutGrid = evEngine.parse(src.replace("\ngrid", ""));
    const svgGrid = evEngine.render(withGrid.value as any, {});
    const svgPlain = evEngine.render(withoutGrid.value as any, {});
    const count = (s: string) => (s.match(/<line/g) ?? []).length;
    expect(count(svgGrid)).toBeGreaterThan(count(svgPlain));
  });

  it("проходит общие инварианты SVG", () => {
    const r = evEngine.parse(src);
    assertSvgInvariants(evEngine.render(r.value as any, {}), { minElements: 6 });
  });
});
