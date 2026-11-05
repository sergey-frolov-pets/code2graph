import { describe, expect, it } from "vitest";
import {
  arrowMarker,
  clamp,
  createSvg,
  esc,
  fmt,
  getPalette,
  hasLabelBreak,
  labelBlockExtra,
  measureLabelWidth,
  measureText,
  niceRange,
  niceTicks,
  splitLabelLines,
  contrastTextColor,
  parseHexColor,
  resolvePalette,
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

describe("splitLabelLines", () => {
  it("без \\n оставляет строку как есть", () => {
    expect(hasLabelBreak("Q1")).toBe(false);
    expect(splitLabelLines("Q1")).toEqual(["Q1"]);
    expect(labelBlockExtra("Q1", 11)).toBe(0);
    expect(measureLabelWidth("Q1", 12)).toBe(measureText("Q1", 12));
  });

  it("режет экранированный \\n и перевод строки", () => {
    expect(splitLabelLines("Роль\\nИмя")).toEqual(["Роль", "Имя"]);
    expect(splitLabelLines("Роль\nИмя")).toEqual(["Роль", "Имя"]);
    expect(labelBlockExtra("Роль\\nИмя", 10)).toBeCloseTo(12, 5);
    expect(measureLabelWidth("Роль\\nИмя", 12)).toBe(Math.max(measureText("Роль", 12), measureText("Имя", 12)));
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

  it("корень с viewBox, size и xmlns", () => {
    const svg = createSvg({ width: 200, height: 100, palette }).toString();
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 200 100"');
    // width/height нужны PNG-экспорту: parseSvgSize() берёт их для canvas.
    expect(svg).toMatch(/<svg[^>]*\swidth="200"/);
    expect(svg).toMatch(/<svg[^>]*\sheight="100"/);
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

describe("parseHexColor / контраст", () => {
  it("понимает #rgb, #rrggbb и альфу", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("#1f2328")).toEqual({ r: 31, g: 35, b: 40 });
    expect(parseHexColor("#1f232880")).toEqual({ r: 31, g: 35, b: 40 });
    expect(parseHexColor("not-a-color")).toBeNull();
  });

  it("подбирает светлый текст на тёмном фоне и тёмный на светлом", () => {
    expect(contrastTextColor("#000000")).toBe(getPalette(true).fg);
    expect(contrastTextColor("#171d24")).toBe(getPalette(true).fg);
    expect(contrastTextColor("#ffffff")).toBe(getPalette(false).fg);
    expect(contrastTextColor("transparent")).toBeNull();
  });

  it("resolvePalette перекрывает фон и текст, но сохраняет цвета баров", () => {
    const palette = resolvePalette(true, "#ffffff");
    expect(palette.bg).toBe("#ffffff");
    expect(palette.fg).toBe(getPalette(false).fg);
    expect(palette.positive).toBe(getPalette(true).positive);

    const manual = resolvePalette(false, "#000000", "#ffcc00");
    expect(manual.fg).toBe("#ffcc00");
  });

  it("без фона палитра та же, что и раньше", () => {
    expect(resolvePalette(true)).toEqual(getPalette(true));
    expect(resolvePalette(false, undefined, "#123456").fg).toBe("#123456");
  });

  it("пустая строка цвета текста — это автоподбор, а не пустая заливка", () => {
    const onDark = resolvePalette(false, "#101418", "");
    expect(onDark.bg).toBe("#101418");
    expect(onDark.fg).toBe(getPalette(true).fg);

    const onLight = resolvePalette(true, "#e8f5ec", "");
    expect(onLight.bg).toBe("#e8f5ec");
    expect(onLight.fg).toBe(getPalette(false).fg);
  });

  it("альфа в цвете фона отбрасывается: заливка сплошная", () => {
    expect(resolvePalette(false, "#ff880080").bg).toBe("#ff8800");
    expect(resolvePalette(false, "transparent").bg).toBe(getPalette(false).bg);
  });
});
