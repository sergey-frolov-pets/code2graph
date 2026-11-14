import { describe, expect, it } from "vitest";
import { parseDashboard, renderDashboard } from "../engines/dashboard";
import { gaugeFraction, parseGauge, renderGauge } from "../engines/gauge";
import {
  parseInfographic,
  renderInfographic,
  resolveInfographicStyle,
} from "../engines/infographic";

const INFO = `infographic
value 1280
prefix "₽ "
postfix " за месяц"
font Inter
fontsize 64
color #0f766e
size 480x240
label top "Выручка" font Inter fontsize 18 color #334155
label left "план" font Inter fontsize 14
label right "факт"
label bottom "год"
when >= 1000 color #15803d show prefix show postfix
when < 0 color #b91c1c hide prefix
`;

describe("infographic", () => {
  it("ставит подпись на каждую сторону и показывает prefix по условию", () => {
    const parsed = parseInfographic(INFO);
    expect(parsed.ok).toBe(true);
    const model = parsed.value!;
    expect(model.labels.map((label) => label.side).sort()).toEqual([
      "bottom",
      "left",
      "right",
      "top",
    ]);
    const style = resolveInfographicStyle(model);
    expect(style.color).toBe("#15803d");
    expect(style.showPrefix).toBe(true);
    const svg = renderInfographic(model);
    expect(svg).toContain('data-side="top"');
    expect(svg).toContain('data-side="left"');
    expect(svg).toContain('data-side="right"');
    expect(svg).toContain('data-side="bottom"');
    expect(svg).toContain("₽ ");
    expect(svg).toContain('data-color="#15803d"');
  });

  it("прячет prefix, когда значение ниже нуля", () => {
    const parsed = parseInfographic(INFO.replace("value 1280", "value -4"));
    expect(parsed.ok).toBe(true);
    const style = resolveInfographicStyle(parsed.value!);
    expect(style.color).toBe("#b91c1c");
    expect(style.showPrefix).toBe(false);
    const svg = renderInfographic(parsed.value!);
    expect(svg).not.toContain("₽ ");
    expect(svg).toContain('data-color="#b91c1c"');
  });

  it("показывает text вместо числа", () => {
    const parsed = parseInfographic(`${INFO}text "готово"\n`);
    expect(parsed.ok).toBe(true);
    expect(renderInfographic(parsed.value!)).toContain("готово");
  });
});

describe("gauge", () => {
  function fractionOf(value: number): number {
    const parsed = parseGauge(`gauge\nmin 0\nmax 100\nvalue ${value}`);
    expect(parsed.ok).toBe(true);
    return gaugeFraction(parsed.value!);
  }

  it("ставит стрелку в нуле, середине и максимуме", () => {
    expect(fractionOf(0)).toBe(0);
    expect(fractionOf(50)).toBeCloseTo(0.5);
    expect(fractionOf(100)).toBe(1);
    const mid = parseGauge("gauge\ntitle Загрузка\nmin 0\nmax 100\nvalue 50");
    const svg = renderGauge(mid.value!);
    expect(svg).toContain('data-role="needle"');
    expect(svg).toContain('data-fraction="0.5"');
  });

  it("принимает минимум не ноль", () => {
    const parsed = parseGauge("gauge\nmin 20\nmax 40\nvalue 30");
    expect(parsed.ok).toBe(true);
    expect(gaugeFraction(parsed.value!)).toBeCloseTo(0.5);
  });
});

describe("dashboard", () => {
  const source = `dashboard
size 1280x720
refresh 5m
zone 0 0 0.5 0.5 diagram "revenue"
zone 0.5 0 0.5 1 diagram "load"
`;

  it("разбирает size, refresh и зоны", () => {
    const parsed = parseDashboard(source);
    expect(parsed.ok).toBe(true);
    expect(parsed.value?.width).toBe(1280);
    expect(parsed.value?.refreshMs).toBe(300_000);
    expect(parsed.value?.zones).toHaveLength(2);
    expect(parsed.value?.zones[1].h).toBe(1);
  });

  it("рисует доли холста и пустую зону без SVG", () => {
    const parsed = parseDashboard(source);
    const svg = renderDashboard(parsed.value!, {
      zoneSvgs: { revenue: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>` },
    });
    expect(svg).toContain('data-diagram="revenue"');
    expect(svg).toContain('data-zone-empty="load"');
    expect(svg).toContain('width="640"');
  });

  it("рисует заголовок, шапку и подвал и оставляет зоны внутри", () => {
    const parsed = parseDashboard(`dashboard
size 1000x500
title "Выручка"
header "ноябрь"
footer "1С"
zone 0 0 1 1 diagram "a"
`);
    expect(parsed.ok).toBe(true);
    const svg = renderDashboard(parsed.value!);
    expect(svg).toContain('data-role="title"');
    expect(svg).toContain('data-role="header"');
    expect(svg).toContain('data-role="footer"');
    expect(svg).toContain("Выручка");
    expect(svg).toContain('y="72"');
  });

  it("не принимает зону за краем холста", () => {
    const parsed = parseDashboard(`dashboard\nzone 0.8 0 0.5 0.5 diagram "a"`);
    expect(parsed.ok).toBe(false);
  });
});
