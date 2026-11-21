import { describe, expect, it } from "vitest";
import { orgchartEngine, type OrgModel } from "@/services/mermaid/ext/engines/orgchart";
import { powermapEngine, type PowerModel } from "@/services/mermaid/ext/engines/powermap";
import { lanePathHits, routeCompact } from "@/services/mermaid/ext/engines/edge-lanes";

type Rect = { x: number; y: number; width: number; height: number };
type Pt = { x: number; y: number };

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
}

function cards(svg: string): Rect[] {
  const out: Rect[] = [];
  for (const tag of svg.match(/<rect[^>]*>/g) ?? []) {
    if (attr(tag, "fill") !== "#ffffff" || attr(tag, "rx") !== "4") continue;
    const x = Number(attr(tag, "x"));
    const y = Number(attr(tag, "y"));
    const width = Number(attr(tag, "width"));
    const height = Number(attr(tag, "height"));
    if ([x, y, width, height].every((value) => Number.isFinite(value))) out.push({ x, y, width, height });
  }
  return out;
}

function edges(svg: string): Pt[][] {
  const out: Pt[][] = [];
  for (const tag of svg.match(/<path[^>]*>/g) ?? []) {
    if (attr(tag, "marker-end") === undefined) continue;
    if (attr(tag, "fill") !== "none") continue;
    const d = attr(tag, "d") ?? "";
    const points = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
    }));
    if (points.length > 1) out.push(points);
  }
  return out;
}

/** Пересечение отрезка с внутренностью карточки: касание кромки не считается. */
function hits(p: Pt, q: Pt, rect: Rect): boolean {
  const pad = 0.6;
  const x0 = rect.x + pad;
  const x1 = rect.x + rect.width - pad;
  const y0 = rect.y + pad;
  const y1 = rect.y + rect.height - pad;
  if (Math.abs(p.y - q.y) < 0.01) {
    const y = p.y;
    if (y <= y0 || y >= y1) return false;
    return Math.min(p.x, q.x) < x1 && Math.max(p.x, q.x) > x0;
  }
  if (Math.abs(p.x - q.x) < 0.01) {
    const x = p.x;
    if (x <= x0 || x >= x1) return false;
    return Math.min(p.y, q.y) < y1 && Math.max(p.y, q.y) > y0;
  }
  return false;
}

function collisions(svg: string): number {
  const boxes = cards(svg);
  let bad = 0;
  for (const path of edges(svg)) {
    for (let index = 0; index < path.length - 1; index += 1) {
      for (const box of boxes) {
        if (hits(path[index], path[index + 1], box)) bad += 1;
      }
    }
  }
  return bad;
}

const PEOPLE = ["Анна", "Илья", "Мария", "Павел", "Елена", "Олег", "Рита", "Глеб", "Нина", "Тимур"];

/** Случайная схема с вложенными командами и связями всех стилей. */
function build(seed: number): { powermap: string; orgchart: string } {
  let state = seed * 1103515245 + 12345;
  const rnd = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rnd() * items.length)];

  const total = 4 + Math.floor(rnd() * 5);
  const nested = rnd() > 0.5;
  const teams = nested ? ["corp", "corp/a", "corp/b"] : ["a", "b"];
  const rows = ["powermap", "title Карта", "company test", `teams layout=${pick(["row", "grid", "column"])} gap=28`];
  for (const id of teams) rows.push(`team ${id} [${id}]`);
  const people: string[] = [];
  const ids: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const id = `p${index}`;
    ids.push(id);
    people.push(
      `${id} [${PEOPLE[index]} ${index}] role=${pick(["E", "D", "A", "U"])} influence=${pick(["L", "M", "S"])} action=${pick(["U", "S", "M"])} attitude=${pick(["+", "0", "-"])} team=${pick(teams)}`,
    );
  }
  const links: string[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index + 1] && rnd() > 0.35) links.push(`${ids[index]} -> ${ids[index + 1]}`);
  }
  for (let step = 0; step < 3 + Math.floor(rnd() * 4); step += 1) {
    const a = pick(ids);
    const b = pick(ids);
    if (a === b) continue;
    links.push(`${a} ${pick(["-ally->", "-coach->", "-enemy->", "->", "-.->"])} ${b}`);
  }
  const powermap = [
    ...rows,
    ...people,
    "link ally color=#1a7f37 style=solid label=союзник",
    "link coach color=#bf8700 style=dot label=наставник",
    "link enemy color=#cf222e style=dash label=противник",
    ...links,
  ].join("\n");

  const orgRows = ["orgchart", `teams layout=${pick(["row", "column", "grid"])} gap=28`];
  for (const id of teams) orgRows.push(`team ${id} [${id}]`);
  const orgPeople = ids.map((id, index) => `${id} [${PEOPLE[index]} ${index}] team=${pick(teams)}`);
  const orgLinks: string[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index + 1] && rnd() > 0.3) orgLinks.push(`${ids[index]} -> ${ids[index + 1]}`);
  }
  for (let step = 0; step < 2 + Math.floor(rnd() * 4); step += 1) {
    const a = pick(ids);
    const b = pick(ids);
    if (a !== b) orgLinks.push(`${a} ${pick(["->", "-.->"])} ${b}`);
  }
  const orgchart = [...orgRows, ...orgPeople, ...orgLinks].join("\n");
  return { powermap, orgchart };
}

describe("связи не заходят внутрь карточек", () => {
  it("powermap: 120 случайных схем", () => {
    const bad: string[] = [];
    for (let seed = 1; seed <= 120; seed += 1) {
      const { powermap } = build(seed);
      const parsed = powermapEngine.parse(powermap);
      if (!parsed.ok) continue;
      const count = collisions(powermapEngine.render(parsed.value as PowerModel, {}));
      if (count > 0) bad.push(`seed ${seed}: ${count}`);
    }
    expect(bad).toEqual([]);
  });

  it("orgchart: 120 случайных схем", () => {
    const bad: string[] = [];
    for (let seed = 1; seed <= 120; seed += 1) {
      const { orgchart } = build(seed);
      const parsed = orgchartEngine.parse(orgchart);
      if (!parsed.ok) continue;
      const count = collisions(orgchartEngine.render(parsed.value as OrgModel, {}));
      if (count > 0) bad.push(`seed ${seed}: ${count}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("короткий маршрут", () => {
  it("обходит карточку полкой или жёлобом и не делает больше четырёх изломов", () => {
    const blocker = { left: 40, right: 180, top: 30, bottom: 80 };
    const points = routeCompact({ x: 20, y: 110 }, { x: 220, y: 10 }, [blocker]);
    let bends = 0;
    for (let index = 1; index < points.length - 1; index += 1) {
      const before = points[index - 1];
      const point = points[index];
      const after = points[index + 1];
      const straight =
        (Math.abs(before.x - point.x) < 0.4 && Math.abs(point.x - after.x) < 0.4) ||
        (Math.abs(before.y - point.y) < 0.4 && Math.abs(point.y - after.y) < 0.4);
      if (!straight) bends += 1;
    }
    expect(bends).toBeLessThanOrEqual(4);
    expect(points.length).toBeLessThanOrEqual(6);
    expect(lanePathHits(points, [blocker])).toBe(false);
  });
});
