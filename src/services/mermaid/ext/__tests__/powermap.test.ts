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

  it("photo= принимает файл на устройстве и адрес в интернете, data:image остаётся запасным", () => {
    const model = modelOf(`powermap
A [Анна] photo="photos/anna-orlova.jpg"
B [Илья] photo="https://example.com/photos/ilya.jpg"
C [Мария] photo="${PHOTO}"
D [Павел] photo="C:/Users/Павел Морозов/pavel.jpg"
E [Елена] photo="file:///home/elena/elena.png"
A -> B
A -> C
A -> D
B -> E`);
    expect(model.people.map((person) => person.photo)).toEqual([
      "photos/anna-orlova.jpg",
      "https://example.com/photos/ilya.jpg",
      PHOTO,
      "C:/Users/Павел Морозов/pavel.jpg",
      "file:///home/elena/elena.png",
    ]);
    const svg = powermapEngine.render(model, {});
    expect(svg).toContain('href="photos/anna-orlova.jpg"');
    expect(svg).toContain('href="file:///home/elena/elena.png"');
    const bad = powermapEngine.parse(`powermap
A [Анна] photo="javascript:alert(1)"
B [Илья] photo="notes.txt"
A -> B`);
    expect(bad.ok).toBe(false);
    expect(bad.errors.some((error) => /фото/.test(error.message))).toBe(true);
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
    // Поле counterpart рисуется построчно: имя встречается в двух карточках и в таблице.
    expect(texts.filter((text) => text === "Пётр Белов").length).toBeGreaterThanOrEqual(2);
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

  it("компания — заголовок таблицы, а первая колонка — сотрудник", () => {
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
    expect(svg).toContain('data-comms-title="powermap"');
    expect(svg).toContain(">Компания Север</text>");
    expect(svg).toContain(">Сотрудник</text>");
    expect(svg).toContain(">Менеджер</text>");
    expect(svg).not.toContain(">Компания Север</text></text>");
    expect(svg).toContain('fill="#f6f8fa"');
    expect(svg).toContain('font-weight="700"');
    const table = /<rect\b([^>]*data-comms="powermap"[^>]*)\/>/.exec(svg)?.[1] ?? "";
    const attr = (name: string) => Number(new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(table)?.[1]);
    const tableX = attr("x");
    const tableWidth = attr("width");
    const headerX = Number(/<text\b[^>]* x="([^"]+)"[^>]*>Сотрудник<\/text>/.exec(svg)?.[1]);
    expect(headerX - tableX).toBeGreaterThanOrEqual(16);
    const linkX = Number(new RegExp(`<text\\b[^>]* x="([^"]+)"[^>]*>${caption}</text>`).exec(svg)?.[1]);
    expect(tableX + tableWidth).toBeGreaterThan(linkX + caption.length * 5);
  });

  it("в таблице коммс есть менеджер из дерева подчинения", () => {
    const svg = powermapEngine.render(modelOf(`powermap
company Север
lang ru
comms on
legend off
Анна [Анна Орлова]
Илья [Илья Сомов]
Анна -> Илья`), {});
    expect(svg).toContain(">Менеджер</text>");
    expect(svg).toContain(">Анна Орлова</text>");
  });

  it("рамка команды по умолчанию сплошная", () => {
    const svg = powermapEngine.render(modelOf(`powermap
team front [Фронт]
Анна [Анна Орлова] team=front
Борис [Борис Ким] team=front
Анна -> Борис`), {});
    const frame = /<rect\b([^>]*data-team="powermap"[^>]*)\/>/.exec(svg)?.[1] ?? "";
    expect(frame).not.toBe("");
    expect(frame).not.toContain("stroke-dasharray");
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

  it("не сливает coach с шиной подчинения и не ведёт штрих сквозь подпись", () => {
    const svg = powermapEngine.render(modelOf(`powermap
link supporter color=#1a7f37 style=solid label=союзник
link enemy color=#cf222e style=dash label=противник
link coach color=#bf8700 style=dot label=наставник
ceo [Анна Орлова|Президент] gender=f
cfo [Илья Сомов|Финансы] gender=m
ops [Мария Ким|Операции] gender=f
sales [Павел Морозов|Продажи] gender=m
legal [Елена Волкова|Юрист] gender=f
ceo -> cfo
ceo -> ops
ceo -> sales
cfo -> legal
cfo -supporter-> ops label=бюджет
ops -enemy-> cfo label="конфликт по результатам 2025"
ceo <-coach-> sales
ceo -coach-> legal`), {});
    const paths = linkPaths(svg);
    const reports = reportPaths(svg);
    const coach = paths.filter((path) => path.dash === "1.5 3.5" && path.both);
    expect(coach).toHaveLength(1);
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      expect(parallelGap(coach[0].points, report.points)).toBeGreaterThanOrEqual(10);
    }
    const texts = [...svg.matchAll(/<text\b[^>]*data-edge-label="1"[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
    expect(texts.sort()).toEqual(["бюджет", "конфликт по результатам 2025"]);
    const plates = labelPlates(svg);
    expect(plates).toHaveLength(2);
    const strokes = [...paths, ...reports];
    for (const plate of plates) {
      for (const path of strokes) {
        for (let index = 0; index < path.points.length - 1; index += 1) {
          expect(segmentHitsRect(path.points[index], path.points[index + 1], plate)).toBe(false);
        }
      }
    }
  });

  it("плашка подписи берёт цвет фона под ней", () => {
    const svg = powermapEngine.render(modelOf(`powermap
team front [Фронт] fill=#ff0000
a [Анна] team=front
b [Борис] team=front
a -> b
a -supporter-> b label=бюджет`), {});
    const plate = [...svg.matchAll(/<rect\b([^>]*)\/>/g)]
      .map((match) => match[1])
      .find((attrs) => attrs.includes('data-label-plate="1"'));
    expect(plate).toBeTruthy();
    // Команда рисуется #ff0000 поверх белого холста с непрозрачностью 0.55.
    expect(plate).toContain('fill="#ff7373"');
  });

  it("подпись держится своей связи: по центру полки и вплотную к ней", () => {
    // Тесный коридор: под полкой supporter идут ещё три связи, а над ней — карточки.
    // Раньше подпись уезжала в сторону и ниже своей линии, чтобы не пересекать чужие штрихи.
    const svg = powermapEngine.render(modelOf(`powermap
team a [A]
team b [B]
teams layout=row gap=24
x [Икс] team=a counterpart="Ольга Ким, Пётр Белов, Леа Ортега"
y [Игрек] team=b counterpart="Леа Ортега"
x -> y
x -supporter-> y label="общий бюджет"
x -.-> y
y -enemy-> x`), {});
    const supporter = [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)].find((match) =>
      match[2].includes('stroke="#1a7f37"'),
    );
    expect(supporter).toBeTruthy();
    const points = pathPoints(supporter![1]);
    let host: { x0: number; x1: number; y: number } | null = null;
    for (let index = 0; index + 1 < points.length; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      if (Math.abs(a.y - b.y) > 0.4) continue;
      const span = Math.abs(a.x - b.x);
      if (span < 12) continue;
      if (!host || span > Math.abs(host.x1 - host.x0)) {
        host = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y: a.y };
      }
    }
    expect(host).toBeTruthy();
    const plate = labelPlates(svg)[0];
    // По центру своей полки, а не у её края.
    expect(Math.abs(plate.x + plate.width / 2 - (host!.x0 + host!.x1) / 2)).toBeLessThanOrEqual(12);
    // Вплотную к линии: зазор не больше 6 px (сверху или снизу).
    const gapAbove = host!.y - (plate.y + plate.height);
    const gapBelow = plate.y - host!.y;
    expect(Math.min(Math.abs(gapAbove), Math.abs(gapBelow))).toBeLessThanOrEqual(6);
  });

  it("объявляет пространство имён xlink у снимка", () => {
    const svg = powermapEngine.render(modelOf(`powermap
ceo [Анна] gender=f photo="${PHOTO}"
cfo [Илья] gender=m
ceo -> cfo`), {});
    expect(svg).toContain("<image ");
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg.indexOf('xmlns:xlink="http://www.w3.org/1999/xlink"')).toBeLessThan(svg.indexOf("xlink:href="));
  });

  it("многострочная подпись стрелки через \\n рисуется отдельными строками", () => {
    const single = powermapEngine.render(oneLineLabelModel(), {});
    const wrapped = powermapEngine.render(twoLineLabelModel("\\n"), {});
    expect(textsOf(wrapped)).toEqual(expect.arrayContaining(["бюджет", "на 2027"]));
    expect(textsOf(single)).not.toContain("на 2027");
    // плашка растёт по высоте и не вылезает на стрелки
    const singlePlate = labelPlates(single)[0];
    const wrappedPlate = labelPlates(wrapped)[0];
    expect(wrappedPlate.height).toBeGreaterThan(singlePlate.height);
  });

  it("многострочная подпись стрелки через <br> работает так же, как \\n", () => {
    const viaBr = powermapEngine.render(twoLineLabelModel("<br>"), {});
    const viaNl = powermapEngine.render(twoLineLabelModel("\\n"), {});
    expect(textsOf(viaBr)).toEqual(textsOf(viaNl));
    expect(labelPlates(viaBr)[0].height).toBeCloseTo(labelPlates(viaNl)[0].height, 5);
  });

  it("однострочная подпись остаётся прежней высоты 14", () => {
    const plate = labelPlates(powermapEngine.render(oneLineLabelModel(), {}))[0];
    expect(plate.height).toBe(14);
  });

  it("многострочная подпись не наезжает на чужие штрихи", () => {
    const svg = powermapEngine.render(twoLineLabelModel("\\n"), {});
    const plates = labelPlates(svg);
    const strokes = [...linkPaths(svg), ...reportPaths(svg)];
    expect(plates.length).toBeGreaterThan(0);
    for (const plate of plates) {
      for (const path of strokes) {
        for (let index = 0; index < path.points.length - 1; index += 1) {
          expect(segmentHitsRect(path.points[index], path.points[index + 1], plate)).toBe(false);
        }
      }
    }
  });
  it("подпись стрелки не наезжает на карточки сотрудников", () => {
    const svg = powermapEngine.render(modelOf(`powermap
ceo [Анна Орлова|Президент]
left [Илья Сомов|Финансы]
mid [Мария Ким|Операции]
right [Пётр Морозов|Разработка]
ceo -> left
ceo -> mid
ceo -> right
left -supporter-> right label="общий бюджет на 2027"`), {});
    const plates = labelPlates(svg);
    const cards = cardRects(svg);
    expect(plates.length).toBeGreaterThan(0);
    expect(cards.length).toBeGreaterThan(0);
    for (const plate of plates) {
      for (const card of cards) {
        const overlapX = Math.min(plate.x + plate.width, card.x + card.width) - Math.max(plate.x, card.x);
        const overlapY = Math.min(plate.y + plate.height, card.y + card.height) - Math.max(plate.y, card.y);
        expect(overlapX > 1 && overlapY > 1).toBe(false);
      }
    }
  });
});

/** Подпись в одну строку — базовая модель для сравнения. */
function oneLineLabelModel() {
  return modelOf(`powermap
ceo [Анна] role=decider
cfo [Илья] role=user
ops [Пётр] role=user
ceo -> cfo
ceo -> ops
cfo -supporter-> ops label="бюджет"`);
}

/** Та же модель, но подпись из двух строк через заданный разделитель. */
function twoLineLabelModel(sep: string) {
  return modelOf(`powermap
ceo [Анна] role=decider
cfo [Илья] role=user
ops [Пётр] role=user
ceo -> cfo
ceo -> ops
cfo -supporter-> ops label="бюджет${sep}на 2027"`);
}

function textsOf(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
}

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

function linkPaths(svg: string): { points: { x: number; y: number }[]; dash: string; both: boolean }[] {
  return [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)]
    .filter((match) => match[2].includes("ext-pm-link-"))
    .map((match) => ({
      points: pathPoints(match[1]),
      dash: /stroke-dasharray="([^"]+)"/.exec(match[2])?.[1] ?? "solid",
      both: match[2].includes("marker-start"),
    }));
}

function reportPaths(svg: string): { points: { x: number; y: number }[] }[] {
  return [...svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)]
    .filter((match) => match[2].includes("ext-pm-report"))
    .map((match) => ({ points: pathPoints(match[1]) }));
}

function pathPoints(d: string): { x: number; y: number }[] {
  const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((item) => Number(item[0]));
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index + 1 < nums.length; index += 2) points.push({ x: nums[index], y: nums[index + 1] });
  return points;
}

function labelPlates(svg: string): { x: number; y: number; width: number; height: number }[] {
  return [...svg.matchAll(/<rect\b([^>]*)\/>/g)]
    .map((match) => match[1])
    .filter((attrs) => attrs.includes('data-label-plate="1"'))
    .map((attrs) => ({
      x: Number(/\bx="([^"]+)"/.exec(attrs)?.[1]),
      y: Number(/\by="([^"]+)"/.exec(attrs)?.[1]),
      width: Number(/\bwidth="([^"]+)"/.exec(attrs)?.[1]),
      height: Number(/\bheight="([^"]+)"/.exec(attrs)?.[1]),
    }));
}

function cardRects(svg: string): { x: number; y: number; width: number; height: number }[] {
  return [...svg.matchAll(/<rect\b([^>]*)\/>/g)]
    .map((match) => match[1])
    .filter(
      (attrs) =>
        !attrs.includes('data-label-plate="1"') &&
        !attrs.includes('data-legend="powermap"') &&
        !attrs.includes('data-team="powermap"'),
    )
    .map((attrs) => ({
      x: Number(/\bx="([^"]+)"/.exec(attrs)?.[1]),
      y: Number(/\by="([^"]+)"/.exec(attrs)?.[1]),
      width: Number(/\bwidth="([^"]+)"/.exec(attrs)?.[1]),
      height: Number(/\bheight="([^"]+)"/.exec(attrs)?.[1]),
    }))
    .filter((rect) => rect.width > 80 && rect.height > 40);
}

function segmentHitsRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
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

function teamRects(svg: string): { id: string; x: number; y: number; width: number; height: number }[] {
  return [...svg.matchAll(/<rect\b([^>]*)\/>/g)]
    .map((match) => match[1])
    .filter((attrs) => attrs.includes('data-team="powermap"'))
    .map((attrs) => ({
      id: /data-team-id="([^"]+)"/.exec(attrs)?.[1] ?? "",
      x: Number(/\bx="([^"]+)"/.exec(attrs)?.[1]),
      y: Number(/\by="([^"]+)"/.exec(attrs)?.[1]),
      width: Number(/\bwidth="([^"]+)"/.exec(attrs)?.[1]),
      height: Number(/\bheight="([^"]+)"/.exec(attrs)?.[1]),
    }));
}

function rectsOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  const overlapX = Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x);
  const overlapY = Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y);
  return overlapX > 1 && overlapY > 1;
}

function inside(
  inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.width <= outer.x + outer.width + 0.5 &&
    inner.y + inner.height <= outer.y + outer.height + 0.5
  );
}

const TEAM_SOURCE = `powermap
title Команды
team front [Front Office] fill=#f6f8fa stroke=#0969da radius=12 padding=16
team back [Back Office]
teams layout=row gap=28
ceo [Анна] role=decider team=front
cfo [Илья] team=front
dev [Пётр] team=back
qa [Мария] team=back
ceo -> cfo
dev -> qa
cfo -supporter-> ceo`;

describe("powermap: команды", () => {
  it("читает директивы team и teams, атрибут team= и создаёт команду сама", () => {
    const model = modelOf(TEAM_SOURCE);
    expect(model.teams.map((team) => team.id)).toEqual(["front", "back"]);
    expect(model.teams[0]).toMatchObject({
      title: "Front Office",
      fill: "#f6f8fa",
      stroke: "#0969da",
      radius: 12,
      padding: 16,
    });
    expect(model.teams[1].title).toBe("Back Office");
    expect(model.teamLayout).toMatchObject({ mode: "row", gap: 28 });
    expect(model.people.map((person) => person.team)).toEqual(["front", "front", "back", "back"]);
  });

  it("не объявленная команда создаётся автоматически с дефолтным стилем", () => {
    const model = modelOf(`powermap
a [Анна] team=front
b [Илья] team=side
a -> b`);
    expect(model.teams.map((team) => team.id)).toEqual(["front", "side"]);
    expect(model.teams[0]).toMatchObject({ title: "front", radius: 10, padding: 14 });
  });

  it("без директив команды список пуст — раскладка прежняя", () => {
    const model = modelOf(`powermap
a [Анна]
b [Илья]
a -> b`);
    expect(model.teams).toEqual([]);
    expect(model.teamLayout).toMatchObject({ mode: "auto", dir: "lr", gap: 24, columns: 2 });
  });

  it("неизвестная раскладка команд — ошибка разбора", () => {
    const parsed = powermapEngine.parse(`powermap
teams layout=circle
a [Анна] team=front`);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]?.message).toContain("раскладка команд");
  });

  it("неверный цвет команды — ошибка разбора", () => {
    const parsed = powermapEngine.parse(`powermap
team front fill=неон
a [Анна] team=front`);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]?.message).toContain("цвет команды");
  });

  it("рамки команд не пересекаются, подписи видны, карточки внутри своих рамок", () => {
    const model = modelOf(TEAM_SOURCE);
    const svg = powermapEngine.render(model, { locale: "ru" }) as string;
    const teams = teamRects(svg);
    expect(teams.map((team) => team.id).sort()).toEqual(["back", "front"]);
    expect(rectsOverlap(teams[0], teams[1])).toBe(false);
    expect(textsOf(svg)).toEqual(expect.arrayContaining(["Front Office", "Back Office"]));

    const cards = cardRects(svg);
    expect(cards.length).toBe(4);
    const front = teams.find((team) => team.id === "front")!;
    const back = teams.find((team) => team.id === "back")!;
    // Верхние карточки каждой команды — внутри своей рамки, с отступом 16 px.
    for (const card of cards) {
      const host = inside(card, front) ? front : back;
      expect(inside(card, host)).toBe(true);
    }
    expect(cards.filter((card) => inside(card, front)).length).toBe(2);
    expect(cards.filter((card) => inside(card, back)).length).toBe(2);
    const topLeft = Math.min(...cards.filter((card) => inside(card, front)).map((card) => card.x));
    expect(topLeft - front.x).toBeGreaterThan(15);
  });

  it("люди без team= идут отдельной виртуальной группой без рамки", () => {
    const svg = powermapEngine.render(
      modelOf(`powermap
team front [Front]
a [Анна] team=front
b [Илья] team=front
loose [Гость]
a -> b
b -> loose`),
      { locale: "ru" },
    ) as string;
    expect(teamRects(svg).map((team) => team.id)).toEqual(["front"]);
    expect(textsOf(svg)).toEqual(expect.arrayContaining(["Гость"]));
    expect(cardRects(svg).length).toBe(3);
  });

  it("вложенные команды: путь и parent= дают рамку внутри рамки", () => {
    const model = modelOf(`powermap
team company [Компания] padding=12
team company/sales [Продажи]
team company/dev [Разработка] parent=company
teams layout=row gap=24
ceo [Анна] team=company
a [Олег] team=company/sales
b [Мария] team=company/sales
c [Пётр] team=company/dev
ceo -> a
ceo -> c
a -> b`);
    expect(model.teams.map((team) => team.id)).toEqual(["company", "company/sales", "company/dev"]);
    expect(model.teams[1].parent).toBe("company");
    const svg = powermapEngine.render(model, { locale: "ru" }) as string;
    const teams = teamRects(svg);
    expect(teams.map((team) => team.id)).toEqual(["company", "company/sales", "company/dev"]);
    const company = teams[0];
    for (const child of teams.slice(1)) {
      expect(child.x).toBeGreaterThan(company.x);
      expect(child.y).toBeGreaterThan(company.y);
      expect(child.x + child.width).toBeLessThan(company.x + company.width);
      expect(child.y + child.height).toBeLessThan(company.y + company.height);
    }
    const cards = cardRects(svg);
    const sales = teams[1];
    const dev = teams[2];
    expect(cards.filter((card) => inside(card, sales)).length).toBe(2);
    expect(cards.filter((card) => inside(card, dev)).length).toBe(1);
    const own = cards.find((card) => !inside(card, sales) && !inside(card, dev))!;
    for (const child of [sales, dev]) expect(rectsOverlap(own, child)).toBe(false);
  });

  it("вложенные команды: родитель по пути создаётся сам", () => {
    const model = modelOf(`powermap
team sales/moscow [Москва]
a [Олег] team=sales/moscow
b [Мария] team=sales/moscow
a -> b`);
    expect(model.teams.map((team) => team.id)).toEqual(["sales", "sales/moscow"]);
    const teams = teamRects(powermapEngine.render(model, { locale: "ru" }) as string);
    expect(teams.map((team) => team.id)).toEqual(["sales", "sales/moscow"]);
    expect(inside(teams[1], teams[0])).toBe(true);
  });

  it("вложенные команды: цикл вложенности не вешает раскладку", () => {
    const model = modelOf(`powermap
team a [A] parent=b
team b [B] parent=a
x [X] team=a
y [Y] team=b
x -> y`);
    expect(model.teams.length).toBe(2);
    expect(teamRects(powermapEngine.render(model, { locale: "ru" }) as string).length).toBe(2);
  });

  it("раскладка grid держит по columns команд в ряду", () => {
    const model = modelOf(`powermap
teams layout=grid columns=2 gap=20
team a [A]
team b [B]
team c [C]
a1 [A1] team=a
b1 [B1] team=b
c1 [C1] team=c
a1 -> b1
b1 -> c1`);
    const teams = teamRects(powermapEngine.render(model, { locale: "ru" }) as string);
    expect(teams.length).toBe(3);
    const rows = new Map<number, number[]>();
    for (const team of teams) {
      const key = Math.round(team.y);
      rows.set(key, [...(rows.get(key) ?? []), team.x]);
    }
    expect(rows.size).toBe(2);
    expect([...rows.values()].map((row) => row.length).sort()).toEqual([1, 2]);
  });

  it("межкомандная стрелка обходит чужие команды и карточки", () => {
    const model = modelOf(`powermap
teams layout=row gap=40
team a [A]
team b [B]
team c [C]
a1 [A1] team=a
a2 [A2] team=a
b1 [B1] team=b
b2 [B2] team=b
c1 [C1] team=c
c2 [C2] team=c
a1 -> a2
b1 -> b2
c1 -> c2
a2 -> c1`);
    const svg = powermapEngine.render(model, { locale: "ru" }) as string;
    const teams = teamRects(svg);
    expect(teams.length).toBe(3);
    const cards = cardRects(svg);
    const b = teams.find((team) => team.id === "b")!;
    const cross = linkPaths(svg);
    expect(cross.length).toBe(1);
    for (const route of cross) {
      for (let index = 0; index < route.points.length - 1; index += 1) {
        const a = route.points[index];
        const next = route.points[index + 1];
        expect(segmentHitsRect(a, next, b)).toBe(false);
        for (const card of cards) expect(segmentHitsRect(a, next, card)).toBe(false);
      }
    }
  });

  it("подпись стрелки не наезжает на чужую команду", () => {
    const model = modelOf(`powermap
teams layout=row gap=40
team a [A]
team b [B]
team c [C]
a1 [A1] team=a
a2 [A2] team=a
b1 [B1] team=b
b2 [B2] team=b
c1 [C1] team=c
c2 [C2] team=c
a1 -> a2
b1 -> b2
c1 -> c2
a1 -supporter-> c2 label="общий бюджет"`);
    const svg = powermapEngine.render(model, { locale: "ru" }) as string;
    const teams = teamRects(svg);
    const plates = labelPlates(svg);
    expect(plates.length).toBe(1);
    for (const plate of plates) {
      for (const team of teams) {
        expect(rectsOverlap(plate, team)).toBe(false);
      }
    }
  });

  it("layout=column ставит вложенные команды друг под другом", () => {
    // Явная раскладка действует на всех уровнях: внутри одной корневой команды тоже.
    const model = modelOf(`powermap
team company [Компания]
team a [A] parent=company
team b [B] parent=company
teams layout=column gap=24
x [Икс] team=a
y [Игрек] team=b
x -> y`);
    const svg = powermapEngine.render(model, { locale: "ru" }) as string;
    const a = teamRects(svg).find((team) => team.id === "a")!;
    const b = teamRects(svg).find((team) => team.id === "b")!;
    expect(b.x).toBeCloseTo(a.x, 0);
    expect(b.y).toBeGreaterThan(a.y + a.height);
  });

  it("labels=off прячет подписи команд (как titles=off)", () => {
    const model = modelOf(`powermap
team a [A]
teams layout=row gap=24 labels=off
x [Икс] team=a
y [Игрек] team=a
x -> y`);
    expect(model.teamLayout).toMatchObject({ titles: false });
    const svg = powermapEngine.render(model, { locale: "ru" }) as string;
    expect(svg).not.toContain('data-team-label="1"');
  });

  it("в моно команды остаются серыми, рамка не пропадает", () => {
    const svg = powermapEngine.render(modelOf(`${TEAM_SOURCE}\nmono`), { locale: "ru" }) as string;
    const teams = teamRects(svg);
    expect(teams.length).toBe(2);
    expect(svg).toMatch(/<rect[^>]*fill="#([0-9a-f]{2})\1\1"[^>]*data-team="powermap"/i);
  });
});

describe("powermap: команды в comms", () => {
  const TEAM_COMMS = `powermap
lang ru
comms on
legend off
link ally color=#1a7f37 style=solid label=союзник
team sales [Продажи]
team eng [Разработка]
a [Анна Орлова] team=sales
b [Илья Сомов] team=eng
c [Борис Ким]
a -ally-> b
b -ally-> a
c -ally-> a`;

  interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const commsBoxes = (svg: string): Box[] =>
    [...svg.matchAll(/<rect\b([^>]*data-comms="powermap"[^>]*)\/>/g)].map((match) => {
      const attr = (name: string) =>
        Number(new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(match[1])?.[1]);
      return { x: attr("x"), y: attr("y"), width: attr("width"), height: attr("height") };
    });

  const textNodes = (
    svg: string,
  ): { x: number; y: number; text: string; caption: boolean }[] =>
    [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((match) => {
      const attr = (name: string) =>
        Number(new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(match[1])?.[1]);
      return {
        x: attr("x"),
        y: attr("y"),
        text: match[2],
        caption: match[1].includes('data-comms-team="powermap"'),
      };
    });

  it("рисует отдельную таблицу на каждую команду и помечает связи между командами", () => {
    const svg = powermapEngine.render(modelOf(TEAM_COMMS), { locale: "ru" }) as string;
    const boxes = commsBoxes(svg);
    // Две объявленные команды и люди без team= — три отдельные таблицы.
    expect(boxes.length).toBe(3);
    const sorted = [...boxes].sort((a, b) => a.y - b.y);
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index].y).toBeGreaterThanOrEqual(sorted[index - 1].y + sorted[index - 1].height);
    }

    const texts = textNodes(svg);
    const captions = texts.filter((node) => node.caption);
    expect(captions.map((node) => node.text)).toEqual(["Продажи", "Разработка", "Без команды"]);
    // Подпись команды стоит над своей таблицей.
    captions.forEach((caption, index) => {
      expect(caption.y).toBeLessThanOrEqual(sorted[index].y);
      expect(caption.y).toBeGreaterThan(sorted[index].y - 24);
    });

    const lines = texts.map((node) => node.text);
    expect(lines).toContain("→ Илья Сомов (Разработка): ally — союзник");
    expect(lines).toContain("← Анна Орлова (Продажи): ally — союзник");
    expect(lines).toContain("→ Анна Орлова (Продажи): ally — союзник");
    // Внутри одной команды пометки нет.
    expect(lines.some((line) => line.includes("Анна Орлова (Продажи): ally") && line.startsWith("←"))).toBe(true);
    expect(lines).not.toContain("→ Анна Орлова: ally — союзник");
  });

  it("ширина колонки связей учитывает пометку чужой команды", () => {
    const svg = powermapEngine.render(modelOf(TEAM_COMMS), { locale: "ru" }) as string;
    const boxes = commsBoxes(svg);
    for (const node of textNodes(svg)) {
      const host = boxes.find(
        (box) => node.x >= box.x && node.y >= box.y && node.y <= box.y + box.height,
      );
      if (!host || !node.text.startsWith("→") && !node.text.startsWith("←") && !node.text.startsWith("↔")) continue;
      // Оценка снизу: символ 11 px шрифта не уже 5 px.
      expect(host.x + host.width).toBeGreaterThan(node.x + node.text.length * 5);
    }
  });
});

describe("powermap: hide", () => {
  const base = `powermap
company Север
lang ru
comms on
legend off
link ally color=#1a7f37 style=solid label=союзник
team corp [Группа]
team corp/board [Совет] fill=#f6f8fa
team corp/field [Подразделения]
Анна [Анна Орлова] team=corp/board
Илья [Илья Сомов] team=corp/board
Мария [Мария Ким] team=corp/field
Пётр [Пётр Белов]
Анна -> Илья
Анна -> Мария
Анна -> Пётр
Илья -ally-> Мария label=бюджет`;

  it("скрывает сотрудника вместе с его связями", () => {
    const model = modelOf(`${base}\nhide Илья`);
    expect(model.people.map((person) => person.id)).toEqual(["Анна", "Мария", "Пётр"]);
    expect(model.reports.map((edge) => `${edge.from}→${edge.to}`)).toEqual([
      "Анна→Мария",
      "Анна→Пётр",
    ]);
    expect(model.influences).toHaveLength(0);
    const svg = powermapEngine.render(model, {});
    expect(svg).not.toContain("Илья Сомов");
  });

  it("скрывает тип связи и его строку в легенде", () => {
    const model = modelOf(`${base}\nhide ally`);
    expect(model.influences).toHaveLength(0);
    expect(model.links.some((link) => link.name === "ally")).toBe(false);
  });

  it("скрывает команду вместе с сотрудниками и их связями", () => {
    const model = modelOf(`${base}\nhide corp/field`);
    expect(model.people.map((person) => person.id)).toEqual(["Анна", "Илья", "Пётр"]);
    expect(model.teams.map((team) => team.id)).toEqual(["corp", "corp/board"]);
    expect(model.influences).toHaveLength(0);
    const svg = powermapEngine.render(model, {});
    expect(svg).not.toContain("Мария Ким");
    expect(svg).not.toContain('data-team-id="corp/field"');
  });

  it("скрывает вложенные команды скрытого родителя", () => {
    const model = modelOf(`${base}\nhide corp`);
    expect(model.teams).toHaveLength(0);
    expect(model.people.map((person) => person.id)).toEqual(["Пётр"]);
    expect(model.reports).toHaveLength(0);
  });

  it("не прячет сотрудников из строки comms, пока команда не скрыта", () => {
    const model = modelOf(`${base}\nhide Пётр`);
    const svg = powermapEngine.render(model, {});
    expect(svg).not.toContain("Пётр Белов");
  });

  it("неизвестный id — ошибка разбора", () => {
    const parsed = powermapEngine.parse(`${base}\nhide НетТакого`);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]?.message).toContain("неизвестный id");
  });
});
