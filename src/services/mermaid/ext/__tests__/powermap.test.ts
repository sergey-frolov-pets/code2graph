import { describe, expect, it } from "vitest";
import { powermapEngine, type PowerModel } from "../engines/powermap";
import { checkFixturesForType } from "./fixtures.test";
import { assertSvgInvariants } from "./svg-invariants";

const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function modelOf(source: string): PowerModel {
  const parsed = powermapEngine.parse(source);
  expect(parsed.ok, parsed.errors[0]?.message).toBe(true);
  return parsed.value as PowerModel;
}

describe("powermap: фикстуры", () => {
  it("все фикстуры типа powermap разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("powermap", (src) => powermapEngine.parse(src));
  });
});

describe("powermap: разбор", () => {
  const source = `powermap
title Карта
company Север
legend on
avatar 64
link ally color=#1a7f37 style=solid label=союзник
CEO [Иван Петров|Директор] role=D influence=L action=U attitude=++ counterpart=да gender=m
CFO [Ольга Орлова|Финансы] role=A influence=M action=S attitude=+ counterpart=- gender=f
Board [Пётр|Совет] role=E gender=?
Quiet [Без фото] avatar=off photo=${PHOTO}
CEO -> CFO
CEO -> Quiet
CEO -.-> Board
CFO -ally-> CEO
Board -enemy-> CFO`;

  it("читает людей, шкалы, подчинение и стрелки влияния", () => {
    const model = modelOf(source);
    expect(model.company).toBe("Север");
    expect(model.legend).toBe(true);
    expect(model.avatarSize).toBe(64);
    expect(model.root).toBe("CEO");
    expect(model.virtualRoot).toBe(false);
    expect(model.people.map((person) => person.name)).toEqual([
      "Иван Петров",
      "Ольга Орлова",
      "Пётр",
      "Без фото",
    ]);
    expect(model.people[1]).toMatchObject({
      title: "Финансы",
      gender: "f",
      counterpart: "-",
      role: { code: "A", name: "Assessor" },
      influence: { code: "M" },
      action: { code: "S" },
      attitude: { code: "+" },
    });
    expect(model.people[2].gender).toBe("?");
    expect(model.people[3].hideAvatar).toBe(true);
    expect(model.people[3].photo).toBe(PHOTO);
    expect(model.reports).toEqual([
      { from: "CEO", to: "CFO", style: "solid" },
      { from: "CEO", to: "Quiet", style: "solid" },
      { from: "CEO", to: "Board", style: "dotted" },
    ]);
    expect(model.influences).toEqual([
      { from: "CFO", to: "CEO", name: "ally" },
      { from: "Board", to: "CFO", name: "enemy" },
    ]);
    expect(model.links.map((link) => link.label)).toEqual(["союзник"]);
  });

  it("оставляет \\| символом | внутри имени", () => {
    const model = modelOf(`powermap
A [Иван\\|Пётр|Директор]
B [Ольга]
A -> B`);
    expect(model.people[0]).toMatchObject({ name: "Иван|Пётр", title: "Директор" });
  });

  it("стрелка влияния не делает руководителя", () => {
    const model = modelOf(`powermap
A [Анна] gender=f
B [Борис] gender=m
A -supporter-> B`);
    expect(model.reports).toEqual([]);
    expect(model.virtualRoot).toBe(true);
    expect(model.influences).toEqual([{ from: "A", to: "B", name: "supporter" }]);
  });

  it("неизвестная связь и цикл подчинения — ошибки", () => {
    const unknown = powermapEngine.parse(`powermap
A [A]
B [B]
A -coach-> B`);
    expect(unknown.ok).toBe(false);
    expect(unknown.errors[0].message).toMatch(/неизвестная связь «coach»/);

    const cycle = powermapEngine.parse(`powermap
A [A]
B [B]
A -> B
B -> A`);
    expect(cycle.ok).toBe(false);
    expect(cycle.errors[0].message).toMatch(/цикл/);
  });

  it("пустая карта и плохая оценка не проходят", () => {
    expect(powermapEngine.parse("powermap").ok).toBe(false);
    const bad = powermapEngine.parse("powermap\nA [A] role=Z");
    expect(bad.ok).toBe(false);
    expect(bad.errors[0].message).toMatch(/role: неизвестное значение/);
  });
});

describe("powermap: рендер", () => {
  it("рисует легенду, силуэт с вопросом и именованную стрелку", () => {
    const model = modelOf(`powermap
company Northwind
legend on
link coach color=#e3c34a style=dot label=coach
A [Анна|Директор] role=D gender=?
B [Борис|Финансы] role=A gender=m photo=${PHOTO}
A -> B
B -enemy-> A`);
    const svg = powermapEngine.render(model, {});
    const width = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)?.[1]);
    const height = Number(/viewBox="0 0 [\d.]+ ([\d.]+)/.exec(svg)?.[1]);
    assertSvgInvariants(svg, { expectSize: { width, height } });
    expect(svg).toContain("Northwind");
    expect(svg).toContain("Roles");
    expect(svg).toContain("Endorser");
    expect(svg).toContain("External counterpart");
    expect(svg).toContain("Other company");
    expect(svg).not.toContain("Direct report");
    expect(svg).toContain("Links");
    expect(svg).toContain("coach");
    expect(svg).not.toContain(">enemy<");
    expect(svg).toContain('data-avatar="?"');
    expect(svg).not.toContain(">?</text>");
    expect(svg).toContain(`href="${PHOTO}"`);
    expect(svg).toContain("ext-pm-link-");
    expect(svg).not.toContain(" Q ");
    const legendY = Number(/data-legend="powermap"[^>]*y="([\d.]+)"/.exec(svg)?.[1] ?? /y="([\d.]+)"[^>]*data-legend="powermap"/.exec(svg)?.[1]);
    const cardBottom = Math.max(
      ...[...svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)>/g)]
        .filter((match) => !match[4].includes("data-legend") && Number(match[2]) > 80 && Number(match[3]) > 40)
        .map((match) => Number(match[1]) + Number(match[3])),
    );
    expect(legendY).toBeGreaterThan(0);
    expect(legendY).toBeGreaterThanOrEqual(cardBottom - 1);
  });

  it("легенда не наезжает на карточки, стрелка влияния их не пересекает", () => {
    const model = modelOf(`powermap
title Power map
company Northwind
legend on
avatar 48
link supporter color=#1a7f37 style=solid label=supporter
link enemy color=#cf222e style=dash label=enemy
CEO [Alex Morgan|President] role=D influence=L action=U attitude=++ counterpart=yes gender=m
CFO [Elena Chen|Finance] role=A influence=M action=S attitude=+ counterpart=- gender=f
Board [Samir Patel|Advisor] role=E influence=S action=M attitude=0 gender=?
CEO -> CFO
CEO -.-> Board
CFO -supporter-> CEO
Board -enemy-> CFO`);
    const svg = powermapEngine.render(model, {});
    const num = (attrs: string, name: string) => Number(new RegExp(`${name}="([^"]+)"`).exec(attrs)?.[1] ?? NaN);
    const rects = [...svg.matchAll(/<rect\b([^>]*)\/?>/g)].map((match) => {
      const attrs = match[1];
      return {
        x: num(attrs, "x"),
        y: num(attrs, "y"),
        width: num(attrs, "width"),
        height: num(attrs, "height"),
        legend: attrs.includes('data-legend="powermap"'),
      };
    });
    const legend = rects.find((rect) => rect.legend);
    expect(legend).toBeTruthy();
    const cards = rects.filter((rect) => !rect.legend && rect.width > 80 && rect.height > 40);
    expect(cards.length).toBeGreaterThan(0);
    const cardBottom = Math.max(...cards.map((card) => card.y + card.height));
    expect(legend!.y).toBeGreaterThanOrEqual(cardBottom - 1);
    for (const card of cards) {
      const overlaps =
        card.x < legend!.x + legend!.width &&
        card.x + card.width > legend!.x &&
        card.y < legend!.y + legend!.height &&
        card.y + card.height > legend!.y;
      expect(overlaps).toBe(false);
    }
    const linkPath = /<path\b([^>]*ext-pm-link-[^>]*)\/>/.exec(svg)?.[1];
    expect(linkPath).toBeTruthy();
    const d = /d="([^"]+)"/.exec(linkPath ?? "")?.[1] ?? "";
    const points = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
    }));
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      for (const card of cards) {
        const inside =
          minX > card.x + 2 &&
          maxX < card.x + card.width - 2 &&
          minY > card.y + 2 &&
          maxY < card.y + card.height - 2;
        expect(inside).toBe(false);
      }
    }
  });

  it("таблица коммуникаций сортирует людей и раскладывает контакты", () => {
    const model = modelOf(`powermap
comms on
legend off
link coach color=#bf8700 style=dot label=наставник
Мария [Мария Ким] counterpart="Пётр Белов; пётр белов, -"
Илья [Илья Сомов] counterpart="Ольга Ким, Пётр Белов"
Анна [Анна Орлова] counterpart=-
Мария -coach-> Илья
Анна -> Мария`);
    expect(model.comms).toBe(true);
    expect(model.legend).toBe(false);
    const svg = powermapEngine.render(model, {});
    const texts = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
    const people = ["Анна Орлова", "Илья Сомов", "Мария Ким"];
    const positions = people.map((name) => texts.indexOf(name));
    expect(positions.every((index) => index >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(texts.filter((text) => text === "Пётр Белов")).toHaveLength(2);
    expect(texts).not.toContain("пётр белов");
    expect(texts).toContain("→ Илья Сомов: coach — наставник");
    expect(texts).toContain("← Мария Ким: coach — наставник");
    expect(texts).not.toContain("Roles");
    const legendBottom = 0;
    const personY = Number(/<text\b[^>]* y="([^"]+)"[^>]*>Анна Орлова<\/text>/.exec(svg)?.[1]);
    expect(personY).toBeGreaterThan(legendBottom);
    expect(svg).toContain('data-comms="powermap"');
    expect(svg).toContain("Company");
    expect(svg).toContain("Contacts");
    expect(svg).toContain("Links");
  });

  it("заголовки таблицы берут имя компании, а двусторонняя стрелка смотрит в обе стороны", () => {
    const model = modelOf(`powermap
company Север
lang ru
comms on
legend off
link ally color=#1a7f37 style=solid label=союзник
Анна [Анна Орлова]
Илья [Илья Сомов]
Анна <-ally-> Илья label=бюджет`);
    expect(model.influences[0]).toMatchObject({ from: "Анна", to: "Илья", name: "ally", both: true, label: "бюджет" });
    const svg = powermapEngine.render(model, {});
    expect(svg).toContain("Компания Север");
    expect(svg).toContain("Контакты");
    expect(svg).toContain("Связи");
    expect(svg).toContain("↔ Илья Сомов: ally — союзник — бюджет");
    expect(svg).toContain("↔ Анна Орлова: ally — союзник — бюджет");
    expect(svg).toContain("marker-start=");
  });

  it("без comms таблица не рисуется", () => {
    const model = modelOf(`powermap
A [Анна]
B [Борис]
A -> B`);
    expect(model.comms).toBe(false);
    const svg = powermapEngine.render(model, {});
    expect(svg).not.toContain('data-comms="powermap"');
  });

  it("legend off и avatar off убирают легенду и блок фото", () => {
    const model = modelOf(`powermap
legend off
avatar off
A [Анна]
B [Борис]
A -> B`);
    const svg = powermapEngine.render(model, {});
    expect(svg).not.toContain("Roles");
    expect(svg).not.toContain("Links");
    expect(svg).not.toContain("clipPath");
    expect(svg).not.toContain('data-avatar="?"');
  });

  it("не пишет подпись типа на стрелке и пишет label только у конкретной связи", () => {
    const plain = modelOf(`powermap
legend on
link ally color=#1a7f37 style=solid label=союзник
A [Анна]
B [Борис]
A -> B
B -ally-> A`);
    const plainSvg = powermapEngine.render(plain, {});
    expect(plainSvg.match(/союзник/g)).toHaveLength(1);
    expect(plainSvg).not.toContain("data-edge-label");

    const captioned = modelOf(`powermap
link ally color=#1a7f37 style=solid label=союзник
A [Анна]
B [Борис]
A -> B
B -ally-> A label="личный союз"`);
    expect(captioned.influences[0]).toMatchObject({ name: "ally", label: "личный союз" });
    const captionedSvg = powermapEngine.render(captioned, {});
    expect(captionedSvg).toContain("личный союз");
    expect(captionedSvg).toContain('data-edge-label="1"');
  });

  it("типы связей в легенде идут в строку и переносятся", () => {
    const svg = powermapEngine.render(modelOf(`powermap
lang ru
link ally color=#1a7f37 style=solid label=союзник
link coach color=#bf8700 style=dot label=наставник
link enemy color=#cf222e style=dash label=противник
A [Анна]
B [Борис]
A -> B`), {});
    const yOf = (label: string) =>
      Number(new RegExp(`<text\\b[^>]* y="([^"]+)"[^>]*>${label}</text>`).exec(svg)?.[1]);
    expect(yOf("союзник")).toBeGreaterThan(0);
    expect(yOf("союзник")).toBe(yOf("наставник"));
    expect(yOf("наставник")).toBe(yOf("противник"));

    const wrapped = powermapEngine.render(modelOf(`powermap
link a color=#111111 style=solid label=оченьдлиннаяподписьсвязиодин
link b color=#222222 style=dash label=оченьдлиннаяподписьсвязидва
link c color=#333333 style=dot label=оченьдлиннаяподписьсвязитри
link d color=#444444 style=dashdot label=оченьдлиннаяподписьсвязичетыре
link e color=#555555 style=solid label=оченьдлиннаяподписьсвязипять
link f color=#666666 style=dash label=оченьдлиннаяподписьсвязишесть
A [Анна]
B [Борис]
A -> B`), {});
    const ys = ["один", "два", "три", "четыре", "пять", "шесть"].map((suffix) =>
      Number(new RegExp(`y="([^"]+)"[^>]*>оченьдлиннаяподписьсвязи${suffix}</text>`).exec(wrapped)?.[1]),
    );
    expect(ys.every((y) => y > 0)).toBe(true);
    expect(new Set(ys).size).toBeGreaterThan(1);
  });

  it("заголовок таблицы светлый, с полями, а колонка связей шире текста", () => {
    const caption = "↔ Илья Сомов: ally — союзник — бюджет";
    const svg = powermapEngine.render(modelOf(`powermap
company Север
lang ru
comms on
legend off
link ally color=#1a7f37 style=solid label=союзник
Анна [Анна Орлова]
Илья [Илья Сомов]
Анна <-ally-> Илья label=бюджет`), {});
    expect(svg).toContain('data-comms-header="powermap"');
    expect(svg).toContain('fill="#f6f8fa"');
    expect(svg).toContain('font-weight="700"');
    const table = /<rect\b([^>]*data-comms="powermap"[^>]*)\/>/.exec(svg)?.[1] ?? "";
    const attr = (name: string) => Number(new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(table)?.[1]);
    const tableX = attr("x");
    const tableWidth = attr("width");
    const headerX = Number(/<text\b[^>]* x="([^"]+)"[^>]*>Компания Север<\/text>/.exec(svg)?.[1]);
    expect(headerX - tableX).toBeGreaterThanOrEqual(16);
    const linkX = Number(new RegExp(`<text\\b[^>]* x="([^"]+)"[^>]*>${caption}</text>`).exec(svg)?.[1]);
    expect(tableX + tableWidth).toBeGreaterThan(linkX + caption.length * 5);
  });

  it("переводит легенду на язык диаграммы, иначе на язык интерфейса", () => {
    const source = `powermap
link supporter color=#1a7f37 style=solid
A [Анна]
B [Борис]
A -> B
B -supporter-> A`;
    const ru = powermapEngine.render(modelOf(`powermap\nlang ru\n${source.slice("powermap\n".length)}`), {});
    expect(ru).toContain("Роли");
    expect(ru).toContain("Внешний контрагент");
    expect(ru).toContain("Покровитель");
    expect(ru).toContain("Связи");
    expect(ru).toContain("сторонник");
    expect(ru).not.toContain(">supporter<");
    expect(ru).not.toContain("Direct report");

    const fromUi = powermapEngine.render(modelOf(source), { locale: "de" });
    expect(fromUi).toContain("Verbindungen");
    expect(fromUi).toContain("Unterstützer");

    const bad = powermapEngine.parse("powermap\nlang xx\nA [A]\nB [B]\nA -> B");
    expect(bad.ok).toBe(false);
    expect(bad.errors[0].message).toMatch(/язык легенды/);
  });

  it("стрелка через уровень обходит карточки, а встречные линии не слипаются", () => {
    const svg = powermapEngine.render(modelOf(`powermap
link supporter color=#1a7f37 style=solid label=союзник
link enemy color=#cf222e style=dash label=противник
link coach color=#bf8700 style=dot label=наставник
ceo [Анна Орлова|Президент]
cfo [Илья Сомов|Финансы]
ops [Мария Ким|Операции]
legal [Елена Волкова|Юрист]
ceo -> cfo
ceo -> ops
cfo -> legal
cfo -supporter-> ops label=бюджет
ops -enemy-> cfo
ceo -coach-> legal`), {});
    const num = (attrs: string, name: string) => Number(new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(attrs)?.[1]);
    const cards = [...svg.matchAll(/<rect\b([^>]*)\/?>/g)]
      .map((match) => match[1])
      .filter((attrs) => !attrs.includes("data-legend") && !attrs.includes("data-comms"))
      .map((attrs) => ({
        x: num(attrs, "x"),
        y: num(attrs, "y"),
        width: num(attrs, "width"),
        height: num(attrs, "height"),
      }))
      .filter((rect) => rect.width > 80 && rect.height > 40);
    const paths = [...svg.matchAll(/<path\b([^>]*)\/>/g)]
      .map((match) => match[1])
      .filter((attrs) => attrs.includes("ext-pm-link-"))
      .map((attrs) => {
        const d = /d="([^"]+)"/.exec(attrs)?.[1] ?? "";
        const points = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((item) => ({
          x: Number(item[1]),
          y: Number(item[2]),
        }));
        return { attrs, points };
      });
    expect(paths).toHaveLength(3);
    for (const path of paths) {
      for (let index = 0; index < path.points.length - 1; index += 1) {
        const a = path.points[index];
        const b = path.points[index + 1];
        for (const card of cards) {
          const hits = segmentCrossesCard(a, b, card);
          expect(hits).toBe(false);
        }
      }
    }
    const pair = paths.filter((path) => !path.attrs.includes("1.5 3.5"));
    expect(pair).toHaveLength(2);
    expect(parallelGap(pair[0].points, pair[1].points)).toBeGreaterThanOrEqual(10);
  });

  it("стрелки влияния не накладываются", () => {
    const model = modelOf(`powermap
link ally color=#1a7f37 style=solid label=ally
link foe color=#cf222e style=dash label=foe
A [Анна]
B [Борис]
C [Олег]
A -> B
A -> C
B -ally-> A
C -foe-> B label=спор`);
    const svg = powermapEngine.render(model, {});
    const paths = [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)]
      .filter((match) => match[2].includes("ext-pm-link-"))
      .map((match) => {
        const nums = [...match[1].matchAll(/-?\d+(?:\.\d+)?/g)].map((item) => Number(item[0]));
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
        return points;
      });
    expect(paths.length).toBe(2);
    expect(strokesOverlay(paths[0], paths[1])).toBe(false);
    expect(svg).toContain("спор");
    expect(svg.match(/data-edge-label/g)).toHaveLength(1);
  });
});

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  const overlap =
    Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));
  return overlap > 0.5;
}

function segmentCrossesCard(
  a: { x: number; y: number },
  b: { x: number; y: number },
  card: { x: number; y: number; width: number; height: number },
): boolean {
  const pad = 3;
  const left = card.x + pad;
  const right = card.x + card.width - pad;
  const top = card.y + pad;
  const bottom = card.y + card.height - pad;
  if (Math.abs(a.x - b.x) < 0.6) {
    if (a.x <= left || a.x >= right) return false;
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    return y1 > top && y0 < bottom;
  }
  if (Math.abs(a.y - b.y) < 0.6) {
    if (a.y <= top || a.y >= bottom) return false;
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    return x1 > left && x0 < right;
  }
  return false;
}

function parallelGap(left: { x: number; y: number }[], right: { x: number; y: number }[]): number {
  let gap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < left.length - 1; i += 1) {
    for (let j = 0; j < right.length - 1; j += 1) {
      const a1 = left[i];
      const a2 = left[i + 1];
      const b1 = right[j];
      const b2 = right[j + 1];
      const bothVertical = Math.abs(a1.x - a2.x) < 0.01 && Math.abs(b1.x - b2.x) < 0.01;
      const bothHorizontal = Math.abs(a1.y - a2.y) < 0.01 && Math.abs(b1.y - b2.y) < 0.01;
      if (bothVertical && rangesOverlap(a1.y, a2.y, b1.y, b2.y)) {
        gap = Math.min(gap, Math.abs(a1.x - b1.x));
      }
      if (bothHorizontal && rangesOverlap(a1.x, a2.x, b1.x, b2.x)) {
        gap = Math.min(gap, Math.abs(a1.y - b1.y));
      }
    }
  }
  return gap;
}

function strokesOverlay(left: { x: number; y: number }[], right: { x: number; y: number }[]): boolean {
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
