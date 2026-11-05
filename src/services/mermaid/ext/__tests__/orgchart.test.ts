import { describe, expect, it } from "vitest";
import { orgchartEngine, type OrgModel } from "../engines/orgchart";
import { checkFixturesForType } from "./fixtures.test";

interface Point {
  x: number;
  y: number;
}

interface OrgCard {
  label: string;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgePath {
  dotted: boolean;
  points: Point[];
}

function edgePaths(svg: string): EdgePath[] {
  return [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)]
    .filter((match) => match[2].includes("marker-end"))
    .map((match) => {
      const nums = [...match[1].matchAll(/-?\d+(?:\.\d+)?/g)].map((item) => Number(item[0]));
      const points: Point[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
      return { dotted: match[2].includes("stroke-dasharray"), points };
    });
}

function cardsIn(svg: string): OrgCard[] {
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
  const texts = [
    ...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g),
  ].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    text: match[3],
  }));
  return rects.map((match) => {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const width = Number(match[3]);
    const height = Number(match[4]);
    const lines = texts
      .filter((t) => t.x >= x && t.x <= x + width && t.y >= y && t.y <= y + height)
      .map((t) => t.text);
    return {
      label: lines.join("\n"),
      lines,
      x,
      y,
      width,
      height,
    };
  });
}

function touchesBottom(path: EdgePath, card: OrgCard): boolean {
  const start = path.points[0];
  return (
    Math.abs(start.y - (card.y + card.height)) < 0.05 &&
    start.x >= card.x - 0.05 &&
    start.x <= card.x + card.width + 0.05
  );
}

function touchesTop(path: EdgePath, card: OrgCard): boolean {
  const end = path.points[path.points.length - 1];
  return Math.abs(end.y - card.y) < 0.05 && end.x >= card.x - 0.05 && end.x <= card.x + card.width + 0.05;
}

function uniqueAxis(paths: EdgePath[], pointIndex: number): number[] {
  const values = new Set<number>();
  for (const path of paths) {
    const index = pointIndex < 0 ? path.points.length + pointIndex : pointIndex;
    values.add(path.points[index].x);
  }
  return [...values];
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  const overlap =
    Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));
  return overlap > 0.5;
}

function strokesOverlay(left: Point[], right: Point[]): boolean {
  for (let i = 0; i < left.length - 1; i += 1) {
    for (let j = 0; j < right.length - 1; j += 1) {
      const a1 = left[i];
      const a2 = left[i + 1];
      const b1 = right[j];
      const b2 = right[j + 1];
      const bothVertical = Math.abs(a1.x - a2.x) < 0.01 && Math.abs(b1.x - b2.x) < 0.01;
      const bothHorizontal = Math.abs(a1.y - a2.y) < 0.01 && Math.abs(b1.y - b2.y) < 0.01;
      if (bothVertical && Math.abs(a1.x - b1.x) < 0.01 && rangesOverlap(a1.y, a2.y, b1.y, b2.y)) {
        return true;
      }
      if (bothHorizontal && Math.abs(a1.y - b1.y) < 0.01 && rangesOverlap(a1.x, a2.x, b1.x, b2.x)) {
        return true;
      }
    }
  }
  return false;
}

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
    const m = r.value as OrgModel;
    expect(m.nodes).toHaveLength(2);
    expect(m.nodes[0]).toMatchObject({ id: "Гендиректор", label: "Генеральный директор" });
    expect(m.edges).toHaveLength(1);
    expect(m.edges[0]).toMatchObject({ from: "Гендиректор", to: "Техдир", style: "solid" });
  });

  it("читает многострочные подписи через \\n", () => {
    const r = orgchartEngine.parse(`orgchart
Гендиректор [Генеральный директор\\nИван Петров]
Техдир [Технический директор\\nАнна Смирнова]
Гендиректор -> Техдир`);
    expect(r.ok).toBe(true);
    const m = r.value as OrgModel;
    expect(m.nodes[0]).toMatchObject({
      id: "Гендиректор",
      label: "Генеральный директор\nИван Петров",
    });
    expect(m.nodes[1]).toMatchObject({
      id: "Техдир",
      label: "Технический директор\nАнна Смирнова",
    });
  });

  it("понимает пунктирное ребро", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
A -.-> B`);
    expect(r.ok).toBe(true);
    expect((r.value as OrgModel).edges[0].style).toBe("dotted");
  });

  it("без подписи в скобках подписью служит id", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B`);
    expect(r.ok).toBe(true);
    const m = r.value as OrgModel;
    expect(m.nodes.map((n) => n.label)).toEqual(["A", "B"]);
  });

  it("находит корень", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
C [C]
A -> B
B -> C`);
    expect(r.ok).toBe(true);
    expect((r.value as OrgModel).root).toBe("A");
  });

  it("несколько корней → виртуальный корень", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
A -> A1
B -> B1`);
    expect(r.ok).toBe(true);
    const m = r.value as OrgModel;
    expect(m.virtualRoot).toBe(true);
  });

  it("ребро на необъявленный узел создаёт его неявно", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B`);
    expect(r.ok).toBe(true);
    expect((r.value as OrgModel).nodes).toHaveLength(2);
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

  it("читает заливку, цвет и стиль границы", () => {
    const r = orgchartEngine.parse(`orgchart
Рук [Руководитель] color=#1f6feb border=#0a3069 style=dash width=2
Зам [Заместитель] fill=#ddf4ff stroke=navy border-style=dotted
Стажёр style=dot
Рук -> Зам
Зам -> Стажёр`);
    expect(r.ok).toBe(true);
    const m = r.value as OrgModel;
    expect(m.nodes[0]).toMatchObject({
      id: "Рук",
      label: "Руководитель",
      fill: "#1f6feb",
      border: "#0a3069",
      borderStyle: "dash",
      borderWidth: 2,
    });
    expect(m.nodes[1]).toMatchObject({
      fill: "#ddf4ff",
      border: "navy",
      borderStyle: "dot",
    });
    expect(m.nodes[2]).toMatchObject({ id: "Стажёр", borderStyle: "dot" });
    expect(m.nodes[2].fill).toBeUndefined();
  });

  it("параметры можно писать в любом порядке, border=dash задаёт стиль", () => {
    const r = orgchartEngine.parse(`orgchart
A [Альфа] style="dashed" width=2px color="#8250df"
B border=dot
A -> B`);
    expect(r.ok).toBe(true);
    const m = r.value as OrgModel;
    expect(m.nodes[0]).toMatchObject({
      fill: "#8250df",
      borderStyle: "dash",
      borderWidth: 2,
    });
    expect(m.nodes[1]).toMatchObject({ id: "B", borderStyle: "dot" });
  });

  it("color= внутри подписи остаётся текстом", () => {
    const r = orgchartEngine.parse(`orgchart
A [роль color=#fff]
A -> B`);
    expect(r.ok).toBe(true);
    const m = r.value as OrgModel;
    expect(m.nodes[0]).toMatchObject({ label: "роль color=#fff" });
    expect(m.nodes[0].fill).toBeUndefined();
  });

  it("оформление дописывается к узлу, созданному ребром", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B
B [Бета] color=red style=dashdot`);
    expect(r.ok).toBe(true);
    const beta = (r.value as OrgModel).nodes.find((node) => node.id === "B");
    expect(beta).toMatchObject({ label: "Бета", fill: "red", borderStyle: "dashdot" });
  });

  it("ошибка: плохой цвет, стиль или неизвестный параметр", () => {
    const badColor = orgchartEngine.parse(`orgchart
A [A] color=not-a-color
A -> B`);
    expect(badColor.ok).toBe(false);
    expect(badColor.errors[0].message).toMatch(/цвет блока/i);

    const badStyle = orgchartEngine.parse(`orgchart
A [A] style=wavy
A -> B`);
    expect(badStyle.ok).toBe(false);
    expect(badStyle.errors[0].message).toMatch(/стиль границы/i);

    const badKey = orgchartEngine.parse(`orgchart
A [A] glow=1
A -> B`);
    expect(badKey.ok).toBe(false);
    expect(badKey.errors[0].message).toMatch(/неизвестный параметр/i);
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
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    expect(svg).toMatch(/^<svg/);
  });

  it("рисует по прямоугольнику на узел", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    expect((svg.match(/<rect/g) ?? []).length).toBe(4);
  });

  it("рисует 4 ребра", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("пунктирное ребро получает stroke-dasharray", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    expect(svg).toContain("stroke-dasharray");
  });

  it("подписи узлов попадают в SVG", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    for (const label of ["Генеральный директор", "Технический директор", "Финансовый директор"]) {
      expect(svg).toContain(label);
    }
  });

  it("узлы не перекрываются по вертикали уровня", () => {
    const r = orgchartEngine.parse(src);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const ys = [...svg.matchAll(/<rect[^>]*\sy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(new Set(ys).size).toBeGreaterThanOrEqual(3);
  });

  it("при одном стиле линия касается центра карточки", () => {
    const r = orgchartEngine.parse(`orgchart
Alpha [Alpha]
Beta [Beta]
Alpha -> Beta`);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const [parent, child] = cardsIn(svg);
    const path = edgePaths(svg)[0];
    expect(path.points[0].x).toBeCloseTo(parent.x + parent.width / 2, 2);
    expect(path.points[0].y).toBeCloseTo(parent.y + parent.height, 2);
    expect(path.points[path.points.length - 1].x).toBeCloseTo(child.x + child.width / 2, 2);
    expect(path.points[path.points.length - 1].y).toBeCloseTo(child.y, 2);
  });

  it("сплошная и пунктирная не делят точку контакта и не накладываются", () => {
    const r = orgchartEngine.parse(`orgchart
Рук [Руководитель]
Альфа [Альфа]
Бета [Бета]
Общий [Общий]
Рук -> Альфа
Рук -> Бета
Рук -.-> Бета
Альфа -> Общий
Бета -.-> Общий`);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const paths = edgePaths(svg);
    const cards = cardsIn(svg);
    const boss = cards.find((card) => card.label === "Руководитель");
    const shared = cards.find((card) => card.label === "Общий");
    expect(boss).toBeDefined();
    expect(shared).toBeDefined();

    const fromBoss = paths.filter((path) => touchesBottom(path, boss as OrgCard));
    const solidLeave = uniqueAxis(fromBoss.filter((path) => !path.dotted), 0);
    const dottedLeave = uniqueAxis(fromBoss.filter((path) => path.dotted), 0);
    expect(solidLeave).toHaveLength(1);
    expect(dottedLeave).toHaveLength(1);
    expect(Math.abs(solidLeave[0] - dottedLeave[0])).toBeCloseTo(16, 2);

    const intoShared = paths.filter((path) => touchesTop(path, shared as OrgCard));
    const solidArrive = uniqueAxis(intoShared.filter((path) => !path.dotted), -1);
    const dottedArrive = uniqueAxis(intoShared.filter((path) => path.dotted), -1);
    expect(solidArrive).toHaveLength(1);
    expect(dottedArrive).toHaveLength(1);
    expect(Math.abs(solidArrive[0] - dottedArrive[0])).toBeCloseTo(16, 2);

    const solid = paths.filter((path) => !path.dotted);
    const dotted = paths.filter((path) => path.dotted);
    for (const left of solid) {
      for (const right of dotted) {
        expect(strokesOverlay(left.points, right.points)).toBe(false);
      }
    }
  });

  it("рёбра разных руководителей на одном уровне не сливаются", () => {
    const r = orgchartEngine.parse(`orgchart
ACS [ACS]
task1 [task1]
AnI [AnI]
task2 [task2]
task3 [task3]
task4 [task4]
ACS -> task1
AnI -> task2
AnI -> task3
AnI -> task4`);
    expect(r.ok).toBe(true);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const paths = edgePaths(svg);
    const cards = cardsIn(svg);
    const card = (label: string) => cards.find((item) => item.label === label) as OrgCard;
    const acs = card("ACS");
    const ani = card("AnI");
    const task1 = card("task1");
    const task2 = card("task2");

    const fromAcs = paths.filter((path) => touchesBottom(path, acs));
    const fromAni = paths.filter((path) => touchesBottom(path, ani));
    expect(fromAcs).toHaveLength(1);
    expect(fromAni).toHaveLength(3);
    expect(touchesTop(fromAcs[0], task1)).toBe(true);
    expect(uniqueAxis(fromAni, 0)).toHaveLength(1);

    const acsBus = fromAcs[0].points[1].y;
    for (const path of fromAni) {
      expect(strokesOverlay(fromAcs[0].points, path.points)).toBe(false);
      expect(path.points[1].y).not.toBeCloseTo(acsBus, 1);
    }

    const intoTask2 = fromAni.find((path) => touchesTop(path, task2)) as EdgePath;
    expect(intoTask2.points[intoTask2.points.length - 1].x).not.toBeCloseTo(fromAcs[0].points[0].x, 1);
    expect(Math.abs(intoTask2.points[1].y - acsBus)).toBeGreaterThanOrEqual(8);
  });

  it("пара сплошного и пунктирного ребра между одними карточками не совпадает", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B]
A -> B
A -.-> B`);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const paths = edgePaths(svg);
    expect(paths).toHaveLength(2);
    expect(strokesOverlay(paths[0].points, paths[1].points)).toBe(false);
    expect(paths[0].points[0].x).not.toBeCloseTo(paths[1].points[0].x, 2);
    expect(paths[0].points[paths[0].points.length - 1].x).not.toBeCloseTo(
      paths[1].points[paths[1].points.length - 1].x,
      2,
    );
  });

  it("длинный текст не обрезается многоточием, а расширяет блок", () => {
    const longLabel =
      "Старший вице-президент по развитию международной партнёрской сети и цифровой трансформации";
    const r = orgchartEngine.parse(`orgchart
CEO [${longLabel}]
CTO [Техдир]
CEO -> CTO`);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    expect(svg).toContain(longLabel);
    expect(svg).not.toContain("…");
    const [ceo, cto] = cardsIn(svg);
    expect(ceo.label).toBe(longLabel);
    expect(ceo.width).toBeGreaterThan(300);
    expect(ceo.width).toBeGreaterThan(cto.width);
    expect(ceo.height).toBeCloseTo(cto.height, 2);
  });

  it("поддерживает несколько строк через \\n и подгоняет высоту и ширину блока", () => {
    const r = orgchartEngine.parse(`orgchart
CEO [Генеральный директор\\nИван Петров\\nДепартамент управления]
CTO [Техдир]
CEO -> CTO`);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const [ceo, cto] = cardsIn(svg);
    expect(ceo.lines).toEqual([
      "Генеральный директор",
      "Иван Петров",
      "Департамент управления",
    ]);
    expect(cto.lines).toEqual(["Техдир"]);
    expect(ceo.height).toBeGreaterThan(cto.height * 1.5);
    expect(ceo.width).toBeGreaterThan(cto.width);

    const path = edgePaths(svg)[0];
    expect(touchesBottom(path, ceo)).toBe(true);
    expect(touchesTop(path, cto)).toBe(true);
  });

  it("заливка, граница и её стиль попадают в SVG, текст остаётся контрастным", () => {
    const r = orgchartEngine.parse(`orgchart
Тёмная [Тёмная] color=#1f2328 border=#cf222e style=dash width=2.5
Светлая [Светлая] fill=#ddf4ff style=dot
Обычная [Обычная]
Тёмная -> Светлая
Тёмная -> Обычная`);
    expect(r.ok).toBe(true);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    const rects = [
      ...svg.matchAll(
        /<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+"([^>]*)\/>/g,
      ),
    ].map((match) => match[1]);
    const dark = rects.find((attrs) => attrs.includes('fill="#1f2328"'));
    const light = rects.find((attrs) => attrs.includes('fill="#ddf4ff"'));
    const plain = rects.find((attrs) => attrs.includes('fill="#ffffff"'));
    expect(dark).toContain('stroke="#cf222e"');
    expect(dark).toContain('stroke-width="2.5"');
    expect(dark).toContain('stroke-dasharray="7 4"');
    expect(light).toContain('stroke="#ddf4ff"');
    expect(light).toContain('stroke-dasharray="1.5 3.5"');
    expect(plain).toContain('stroke="#656d76"');
    expect(plain).not.toContain("stroke-dasharray");

    expect(svg).toMatch(/<text[^>]*fill="#e6edf3"[^>]*>Тёмная<\/text>/);
    expect(svg).toMatch(/<text[^>]*fill="#1f2328"[^>]*>Светлая<\/text>/);
    expect(svg).toMatch(/<text[^>]*fill="#1f2328"[^>]*>Обычная<\/text>/);
  });

  it("корень без своего цвета остаётся акцентным", () => {
    const r = orgchartEngine.parse(`orgchart
A [A]
B [B] style=solid
A -> B`);
    const svg = orgchartEngine.render(r.value as OrgModel, {});
    expect(svg).toContain('fill="#8250df"');
    expect(svg).toContain('stroke="#8250df"');
    const plain = svg.match(/<rect[^>]*fill="#ffffff"[^>]*>/)?.[0] ?? "";
    expect(plain).toContain('stroke="#656d76"');
    expect(plain).not.toContain("stroke-dasharray");
  });

  it("циклическое ребро не ломает рендер", () => {
    const r = orgchartEngine.parse(`orgchart
A -> B
B -> C
C -> B`);
    if (r.ok) {
      expect(() => orgchartEngine.render(r.value as OrgModel, {})).not.toThrow();
    } else {
      expect(r.errors[0].message).toMatch(/цикл/i);
    }
  });
});
