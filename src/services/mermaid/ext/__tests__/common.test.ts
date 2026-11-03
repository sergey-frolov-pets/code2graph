import { describe, expect, it } from "vitest";
import {
  arrowMarker,
  clamp,
  createSvg,
  esc,
  fmt,
  getPalette,
  measureText,
  niceRange,
  niceTicks,
  textHeight,
  truncate,
} from "../common";

describe("esc", () => {
  it("экранирует пять спецсимволов", () => {
    expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
  it("null и undefined → пустая строка", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("fmt", () => {
  it("убирает хвостовые нули", () => {
    expect(fmt(40)).toBe("40");
    expect(fmt(12.5)).toBe("12.5");
    expect(fmt(12.345)).toBe("12.35");
  });
  it("не падает на NaN/Infinity", () => {
    expect(fmt(NaN)).toBe("0");
    expect(fmt(Infinity)).toBe("0");
  });
});

describe("clamp", () => {
  it("ограничивает с двух сторон", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("measureText", () => {
  it("растёт с длиной строки", () => {
    expect(measureText("aaaa", 12)).toBeGreaterThan(measureText("aa", 12));
  });
  it("растёт с размером шрифта", () => {
    expect(measureText("abc", 24)).toBeCloseTo(measureText("abc", 12) * 2, 5);
  });
  it("кириллица шире латиницы при том же числе символов", () => {
    expect(measureText("привет", 12)).toBeGreaterThan(measureText("privet", 12));
  });
  it("заглавные шире строчных", () => {
    expect(measureText("AAAA", 12)).toBeGreaterThan(measureText("aaaa", 12));
  });
  it("цифры и пробелы дают осмысленную ширину", () => {
    expect(measureText("1 200", 12)).toBeGreaterThan(0);
  });
  it("пустая строка → 0", () => {
    expect(measureText("", 12)).toBe(0);
  });
});

describe("textHeight", () => {
  it("1.2 от размера шрифта", () => {
    expect(textHeight(10)).toBeCloseTo(12, 5);
  });
});

describe("truncate", () => {
  it("короткая строка не меняется", () => {
    expect(truncate("abc", 1000, 12)).toBe("abc");
  });
  it("длинная обрезается с многоточием", () => {
    const out = truncate("очень длинная подпись которая не влезает", 60, 12);
    expect(out.endsWith("…")).toBe(true);
    expect(measureText(out, 12)).toBeLessThanOrEqual(60 + 1);
  });
  it("не влезает даже многоточие — возвращает многоточие", () => {
    expect(truncate("abcdef", 1, 12)).toBe("…");
  });
});

describe("niceTicks", () => {
  it("даёт круглые деления в диапазоне", () => {
    const ticks = niceTicks(0, 120, 5);
    expect(ticks.length).toBeGreaterThan(1);
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(120);
    }
  });
  it("работает с отрицательным диапазоном", () => {
    const ticks = niceTicks(-40, 20, 5);
    expect(ticks.some((t) => t < 0)).toBe(true);
    expect(ticks.some((t) => t > 0)).toBe(true);
  });
  it("вырожденный диапазон не падает", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});

describe("niceRange", () => {
  it("расширяет границы до круглых", () => {
    const r = niceRange(3, 97, 5);
    expect(r.min).toBeLessThanOrEqual(3);
    expect(r.max).toBeGreaterThanOrEqual(97);
  });
  it("min === max не падает", () => {
    const r = niceRange(5, 5);
    expect(r.max).toBeGreaterThan(r.min);
  });
});

describe("getPalette", () => {
  it("светлая и тёмная различаются", () => {
    expect(getPalette(false).bg).not.toBe(getPalette(true).bg);
  });
  it("тёмная тема — тёмный фон", () => {
    expect(getPalette(true).bg).toMatch(/^#1/);
  });
});

describe("createSvg", () => {
  const palette = getPalette(false);

  it("корень без width/height, с viewBox и xmlns", () => {
    const svg = createSvg({ width: 200, height: 100, palette }).toString();
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg).not.toMatch(/<svg[^>]*\swidth=/);
    expect(svg).not.toMatch(/<svg[^>]*\sheight=/);
  });

  it("рисует фон", () => {
    const svg = createSvg({ width: 10, height: 10, palette }).toString();
    expect(svg).toContain(`fill="${palette.bg}"`);
  });

  it("заголовок попадает в <title>", () => {
    const svg = createSvg({ width: 10, height: 10, palette, title: "Тест" }).toString();
    expect(svg).toContain("<title>Тест</title>");
  });

  it("текст экранируется", () => {
    const b = createSvg({ width: 100, height: 100, palette });
    b.text(10, 10, "<script>alert(1)</script>");
    const svg = b.toString();
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("debugFrames добавляет data-debug", () => {
    const b = createSvg({ width: 100, height: 100, palette, debugFrames: true });
    b.rect(0, 0, 10, 10);
    expect(b.toString()).toContain('data-debug="rect"');
  });

  it("без debugFrames нет data-debug", () => {
    const b = createSvg({ width: 100, height: 100, palette });
    b.rect(0, 0, 10, 10);
    expect(b.toString()).not.toContain("data-debug");
  });

  it("группа оборачивает содержимое", () => {
    const b = createSvg({ width: 100, height: 100, palette });
    b.group({ transform: "translate(5,5)" }, () => {
      b.circle(0, 0, 3);
    });
    const svg = b.toString();
    expect(svg).toContain('<g transform="translate(5,5)">');
    expect(svg).toContain("<circle");
    expect(svg).toContain("</g>");
  });

  it("числа форматируются без хвостовых нулей", () => {
    const b = createSvg({ width: 100, height: 100, palette });
    b.circle(10.5, 20, 3.333);
    expect(b.toString()).toContain('cx="10.5"');
    expect(b.toString()).toContain('r="3.33"');
  });
});

describe("arrowMarker", () => {
  it("возвращает defs и url-ссылку", () => {
    const m = arrowMarker(getPalette(false), "arr1");
    expect(m.markup).toContain("<defs>");
    expect(m.markup).toContain('id="arr1"');
    expect(m.ref).toBe("url(#arr1)");
  });
});
