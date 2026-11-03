import { describe, expect, it } from "vitest";
import { orgchartEngine } from "../engines/orgchart";
import { checkFixturesForType } from "./fixtures.test";

describe("orgchart: фикстуры", () => {
  it("все фикстуры типа orgchart разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("orgchart", (src) => orgchartEngine.parse(src));
  });
});

describe("orgchart: разбор", () => {
  it("читает узлы и рёбра", () => {
    const r = orgchartEngine.parse(`orgchart
Гендиректор [Генеральный директор]
Техдир [Технический директор]
Гендиректор -> Техдир`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.nodes).toHaveLength(2);
    expect(m.nodes[0]).toMatchObject({ id: "Гендиректор", label: "Генеральный директор" });
    expect(m.edges).toHaveLength(1);
    expect(m.edges[0]).toMatchObject({ from: "Гендиректор", to: "Техдир", style: "solid" });
  });

  it("понимает пунктирное ребро", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
A -.-> B`);
    expect(r.ok).toBe(true);
    expect((r.value as any).edges[0].style).toBe("dotted");
  });

  it("без подписи в скобках подписью служит id", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.nodes.map((n: any) => n.label)).toEqual(["A", "B"]);
  });

  it("находит корень", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
C [C]
A -> B
B -> C`);
    expect(r.ok).toBe(true);
    expect((r.value as any).root).toBe("A");
  });

  it("несколько корней → виртуальный корень", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
A -> A1
B -> B1`);
    expect(r.ok).toBe(true);
    const m = r.value as any;
    expect(m.virtualRoot).toBe(true);
  });

  it("ребро на необъявленный узел создаёт его неявно", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B`);
    expect(r.ok).toBe(true);
    expect((r.value as any).nodes).toHaveLength(2);
  });

  it("ошибка: нет рёбер", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/нет рёбер/i);
  });

  it("ошибка: все узлы в цикле", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B
B -> C
C -> A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/не найден корень|цикл/i);
  });

  it("ошибка: невалидный синтаксис ребра", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
A => B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ребро|недопустим/i);
  });

  it("parse никогда не бросает исключение", () => {
    for (const src of ["", "orgchart", "orgchart\n->", "orgchart\nA -> "]) {
      expect(() => orgchartEngine.parse(src)).not.toThrow();
    }
  });
});

describe("orgchart: рендер", () => {
  const src = `orgchart
Гендиректор [Генеральный директор]
Техдир [Технический директор]
Финдир [Финансовый директор]
Бэкенд [Руководитель бэкенда]
Гендиректор -> Техдир
Гендиректор -> Финдир
Техдир -> Бэкенд
Финдир -.-> Бэкенд`;

  it("возвращает SVG без width/height", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as any, {});
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
  });

  it("рисует по прямоугольнику на узел", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as any, {});
    expect((svg.match(/<rect/g) ?? []).length).toBe(4);
  });

  it("рисует 4 ребра", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as any, {});
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("пунктирное ребро получает stroke-dasharray", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as any, {});
    expect(svg).toContain("stroke-dasharray");
  });

  it("подписи узлов попадают в SVG", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as any, {});
    for (const label of ["Генеральный директор", "Технический директор", "Финансовый директор"]) {
      expect(svg).toContain(label);
    }
  });

  it("узлы не перекрываются по вертикали уровня", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as any, {});
    const ys = [...svg.matchAll(/<rect[^>]*\sy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(new Set(ys).size).toBeGreaterThanOrEqual(3);
  });

  it("циклическое ребро не ломает рендер", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B
B -> C
C -> B`);
    if (r.ok) {
      expect(() => orgchartEngine.render(r.value as any, {})).not.toThrow();
    } else {
      expect(r.errors[0].message).toMatch(/цикл/i);
    }
  });
});
