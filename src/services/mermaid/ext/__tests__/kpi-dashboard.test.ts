import { describe, expect, it } from "vitest";
import { getMermaidSampleSource } from "@/constants/mermaid-sample-diagrams";
import { measureText } from "../common";
import { parseDashboard, renderDashboard } from "../engines/dashboard";
import { gaugeFraction, parseGauge, renderGauge } from "../engines/gauge";
import {
  parseInfographic,
  renderInfographic,
  resolveInfographicStyle,
} from "../engines/infographic";

function assertTextInside(svg: string): void {
  const size = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  expect(size).toBeTruthy();
  const width = Number(size?.[1]);
  const height = Number(size?.[2]);
  const re = /<text\b([^>]*)>([^<]*)<\/text>/g;
  for (const match of svg.matchAll(re)) {
    const attrs = match[1];
    const content = match[2]
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"');
    const num = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(attrs)?.[1]);
    const x = num("x");
    const y = num("y");
    const fontSize = num("font-size");
    const anchor = /text-anchor="([^"]+)"/.exec(attrs)?.[1] ?? "middle";
    const middle = /dominant-baseline="middle"/.test(attrs);
    const textWidth = measureText(content, fontSize);
    const left = anchor === "start" ? x : anchor === "end" ? x - textWidth : x - textWidth / 2;
    expect(left, content).toBeGreaterThanOrEqual(-1);
    expect(left + textWidth, content).toBeLessThanOrEqual(width + 1);
    const top = middle ? y - fontSize * 0.55 : y - fontSize * 0.92;
    const bottom = middle ? y + fontSize * 0.55 : y + fontSize * 0.28;
    expect(top, content).toBeGreaterThanOrEqual(-1);
    expect(bottom, content).toBeLessThanOrEqual(height + 1);
  }
}

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

  it("уменьшает длинную строку, чтобы рамка её не обрезала", () => {
    const parsed = parseInfographic(`infographic
value 1280
prefix "₽ "
postfix " за месяц"
fontsize 200
size 220x90
label top "Очень длинная подпись выручки"
label left "план на год"
label right "факт"
`);
    expect(parsed.ok).toBe(true);
    const svg = renderInfographic(parsed.value!);
    expect(svg).toContain("₽ ");
    expect(svg).toContain("за месяц");
    const size = /data-role="value"[^>]*font-size="([\d.]+)"|font-size="([\d.]+)"[^>]*data-role="value"/.exec(svg);
    const painted = Number(size?.[1] ?? size?.[2]);
    expect(painted).toBeLessThan(200);
    assertTextInside(svg);
  });

  it("не трогает кегль, которому и так хватает места", () => {
    const parsed = parseInfographic("infographic\nvalue 5\nfontsize 64\nsize 480x240\n");
    expect(parsed.ok).toBe(true);
    expect(renderInfographic(parsed.value!)).toContain('font-size="64"');
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

  it("без опций внешнего вида рисует прежнюю дугу", () => {
    const parsed = parseGauge("gauge\ntitle Load\nmin 0\nmax 100\nvalue 72");
    expect(parsed.ok).toBe(true);
    const svg = renderGauge(parsed.value!);
    expect(svg).toContain('width="360"');
    expect(svg).toContain('d="M 60 168 A 120 120 0 0 1 300 168"');
    expect(svg).toContain('stroke-width="14"');
    expect(svg).toContain('stroke-width="4"');
    assertTextInside(svg);
  });

  it("разбирает цвет, толщину, размер и секторы", () => {
    const parsed = parseGauge(`gauge
title Загрузка сервера
min 0
max 100
value 72
label "72 %"
color #1d4ed8
track #e2e8f0
arc #0f766e
thickness 16
needle 5
font Inter
fontsize 26
size 420x250
zone 0 60 #16a34a "норма"
zone 60 85 #ca8a04 "внимание"
zone 85 100 #dc2626 "перегруз"
`);
    expect(parsed.ok).toBe(true);
    const model = parsed.value!;
    expect(model.track).toBe("#e2e8f0");
    expect(model.arc).toBe("#0f766e");
    expect(model.thickness).toBe(16);
    expect(model.needle).toBe(5);
    expect(model.fontSize).toBe(26);
    expect(model.width).toBe(420);
    expect(model.zones).toHaveLength(3);
    expect(model.zones[0].label).toBe("норма");
    const svg = renderGauge(model);
    expect(svg).toContain('data-role="zone"');
    expect(svg).toContain('data-role="arc"');
    expect(svg).toContain('data-role="legend"');
    expect(svg).toContain("#16a34a");
    expect(svg).toContain("перегруз");
    assertTextInside(svg);
  });

  it("примеры на русском и английском держат текст внутри рамки", () => {
    for (const locale of ["ru", "en"] as const) {
      const gauge = parseGauge(getMermaidSampleSource("gauge", locale));
      expect(gauge.ok, gauge.errors.map((issue) => issue.message).join("; ")).toBe(true);
      assertTextInside(renderGauge(gauge.value!));
      const info = parseInfographic(getMermaidSampleSource("infographic", locale));
      expect(info.ok, info.errors.map((issue) => issue.message).join("; ")).toBe(true);
      assertTextInside(renderInfographic(info.value!));
    }
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

  it("не принимает зону за краем холста", () => {
    const parsed = parseDashboard(`dashboard\nzone 0.8 0 0.5 0.5 diagram "a"`);
    expect(parsed.ok).toBe(false);
  });
});
