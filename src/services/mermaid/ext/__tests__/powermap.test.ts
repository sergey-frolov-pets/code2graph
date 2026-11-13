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
    expect(svg).toContain("Direct report");
    expect(svg).toContain("Links");
    expect(svg).toContain("coach");
    expect(svg).toContain("enemy");
    expect(svg).toContain(">?</text>");
    expect(svg).toContain(`href="${PHOTO}"`);
    expect(svg).toContain("ext-pm-link-");
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
    expect(svg).not.toContain("clipPath");
    expect(svg).not.toContain(">?</text>");
  });
});
