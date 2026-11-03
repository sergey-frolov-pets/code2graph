import { describe, expect, it } from "vitest";
import { waterfallEngine, type WaterfallModel } from "../engines/waterfall";
import { checkFixturesForType } from "./fixtures.test";
import { assertSvgInvariants } from "./svg-invariants";

describe("waterfall: фикстуры", () => {
  it("все фикстуры типа waterfall разбираются (кроме помеченных как битые)", () => {
    checkFixturesForType("waterfall", (src) => waterfallEngine.parse(src));
  });
});

describe("waterfall: разбор", () => {
  it("читает заголовок, ось и колонки", () => {
    const r = waterfallEngine.parse(`waterfall
title Выручка 2026
y "млн ₽" 0 --> 120
=40 : Q1
+15 : Q2
+20 : Q3
=75 : Итог`);
    expect(r.ok).toBe(true);
    const m = r.value as WaterfallModel;
    expect(m.title).toBe("Выручка 2026");
    expect(m.axis.label).toBe("млн ₽");
    expect(m.axis.min).toBe(0);
    expect(m.axis.max).toBe(120);
    expect(m.series).toHaveLength(1);
    expect(m.series[0].steps).toHaveLength(4);
    expect(m.series[0].steps[0]).toMatchObject({ kind: "absolute", value: 40, label: "Q1" });
    expect(m.series[0].steps[1]).toMatchObject({ kind: "delta", value: 15, label: "Q2" });
    expect(m.series[0].steps[2]).toMatchObject({ kind: "delta", value: 20, label: "Q3" });
    expect(m.series[0].steps[3]).toMatchObject({ kind: "absolute", value: 75, label: "Итог" });
  });

  it("понимает отрицательное абсолютное значение", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : Начало
-25 : Падение
=-10 : Итог`);
    expect(r.ok).toBe(true);
    const steps = (r.value as WaterfallModel).series[0].steps;
    expect(steps[2]).toMatchObject({ kind: "absolute", value: -10 });
  });

  it("понимает тысячные разделители и дробные числа", () => {
    const r = waterfallEngine.parse(`waterfall
=1 200 : Старт
+12.5 : Рост
+1_000 : Ещё`);
    expect(r.ok).toBe(true);
    const steps = (r.value as WaterfallModel).series[0].steps;
    expect(steps[0].value).toBe(1200);
    expect(steps[1].value).toBe(12.5);
    expect(steps[2].value).toBe(1000);
  });

  it("строит несколько групп через series", () => {
    const r = waterfallEngine.parse(`waterfall-multi
series Базовый
=50 : Старт
+30 : Рост
series Оптимистичный
=50 : Старт
+45 : Рост`);
    expect(r.ok).toBe(true);
    const m = r.value as WaterfallModel;
    expect(m.series).toHaveLength(2);
    expect(m.series[0].name).toBe("Базовый");
    expect(m.series[1].name).toBe("Оптимистичный");
  });

  it("считает шкалу автоматически, если y не задан", () => {
    const r = waterfallEngine.parse(`waterfall
=1200 : Начало
+350 : Рост
-800 : Падение
=750 : Итог`);
    expect(r.ok).toBe(true);
    const axis = (r.value as WaterfallModel).axis;
    expect(axis.auto).toBe(true);
    expect(axis.min).toBeLessThanOrEqual(1200);
    expect(axis.max).toBeGreaterThanOrEqual(1550);
  });

  it("ошибка: нет данных", () => {
    const r = waterfallEngine.parse(`waterfall
title Пусто
y "млн ₽" 0 --> 100`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/нет данных/i);
  });

  it("ошибка: первая колонка не абсолютная", () => {
    const r = waterfallEngine.parse(`waterfall
+10 : A
=20 : B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/первая колонка/i);
    expect(r.errors[0].line).toBe(2);
  });

  it("ошибка: непарсящееся число", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : A
+abc : B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/число/i);
  });

  it("ошибка: нет двоеточия", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : A
+15 B`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/ожидается формат/i);
  });

  it("ошибка: series без данных", () => {
    const r = waterfallEngine.parse(`waterfall-multi
series Пустой
series Второй
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/не содержит данных/i);
  });

  it("parse никогда не бросает исключение", () => {
    for (const src of ["", "waterfall", "%% только коммент", "waterfall\n:::", "waterfall\n= : x"]) {
      expect(() => waterfallEngine.parse(src)).not.toThrow();
    }
  });
});

describe("waterfall: рендер", () => {
  it("возвращает SVG с viewBox и без width/height", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
=55 : Итог`);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
  });

  it("содержит подписи колонок", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
=55 : Итог`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain("Q1");
    expect(svg).toContain("Q2");
    expect(svg).toContain("Итог");
  });

  it("тёмная тема меняет палитру", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
=40 : Q2`);
    const light = waterfallEngine.render(r.value as WaterfallModel, { dark: false });
    const dark = waterfallEngine.render(r.value as WaterfallModel, { dark: true });
    expect(light).not.toBe(dark);
  });

  it("debugFrames добавляет обводку и data-атрибуты", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
=40 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, { debugFrames: true });
    expect(svg).toContain("data-debug");
  });

  it("проходит общие инварианты SVG", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
=40 : Q2`);
    const svgForSize = waterfallEngine.render(r.value as WaterfallModel, {});
    assertSvgInvariants(svgForSize, {
      minElements: 6,
      expectSize: {
        width: Number(/viewBox="0 0 ([\d.]+)/.exec(svgForSize)?.[1]),
        height: Number(/viewBox="0 0 [\d.]+ ([\d.]+)/.exec(svgForSize)?.[1]),
      },
    });
  });
});

describe("waterfall: разрывы шкалы", () => {
  it("разбирает break с подписью и без", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=100 : Старт
+900 : Рост
break 300 --> 800 "разрыв"
=1000 : Итог`);
    expect(r.ok).toBe(true);
    const m = r.value as WaterfallModel;
    expect(m.breaks).toHaveLength(1);
    expect(m.breaks[0]).toMatchObject({ after: 300, before: 800, label: "разрыв" });
  });

  it("разрыв сжимает участок: бары по обе стороны становятся выше", () => {
    const src = `waterfall
y "" 0 --> 1000
=100 : A
+900 : B`;
    const plain = waterfallEngine.parse(src);
    const broken = waterfallEngine.parse(`${src}\nbreak 300 --> 800`);
    expect(broken.ok).toBe(true);
    const barOf = (svg: string, fill: string) => {
      const re = new RegExp(`<rect x="[\\d.]+" y="([\\d.]+)" width="[\\d.]+" height="([\\d.]+)" fill="${fill}"`);
      const m = re.exec(svg);
      return m ? { y: Number(m[1]), h: Number(m[2]) } : null;
    };
    const plainDelta = barOf(waterfallEngine.render(plain.value as WaterfallModel, {}), "#2da44e");
    const brokenDelta = barOf(waterfallEngine.render(broken.value as WaterfallModel, {}), "#2da44e");
    expect(plainDelta).not.toBeNull();
    expect(brokenDelta).not.toBeNull();
    // Шкала та же (0..1000), но участок 300..800 сжат → бар «+900» выше.
    expect(brokenDelta!.h).toBeGreaterThan(plainDelta!.h);
    // Бар пересекает весь сжатый участок (300..800): выигрыш = BREAK_HEIGHT
    // минус то, что остаток шкалы (0..300 и 800..1000) стал плотнее.
    expect(brokenDelta!.h - plainDelta!.h).toBeGreaterThan(1);
  });

  it("рисует пунктирные линии разрыва и подпись", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=100 : A
+900 : B
break 300 --> 800 "разрыв"`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain("stroke-dasharray");
    expect(svg).toContain("разрыв");
  });

  it("ошибка: «до» меньше «после»", () => {
    const r = waterfallEngine.parse(`waterfall
=10 : A
break 800 --> 300`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/должно быть больше/i);
  });

  it("ошибка: пересекающиеся разрывы", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=10 : A
break 100 --> 500
break 400 --> 900`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/пересекаются/i);
  });

  it("разрыв вне шкалы игнорируется, а не ломает рендер", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=10 : A
+20 : B
break 500 --> 900`);
    expect(r.ok).toBe(true);
    expect((r.value as WaterfallModel).breaks).toHaveLength(0);
  });
});

describe("waterfall: подписи внутри и над барами", () => {
  it("labels inside — подпись значения внутри бара", () => {
    const r = waterfallEngine.parse(`waterfall
labels inside
y "" 0 --> 100
=40 : Q1
+50 : Q2`);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain("#ffffff"); // белый текст внутри бара
  });

  it("labels none — подписей значений нет", () => {
    const r = waterfallEngine.parse(`waterfall
labels none
y "" 0 --> 100
=40 : Q1
+50 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).not.toContain(">+50<");
    // «>40<» есть в подписях делений оси — проверяем именно тексты значений (font-size 10).
    expect(svg).not.toMatch(/font-size="10"[^>]*>40</);
  });

  it("per-step флаг inside перекрывает общий режим", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=40 : Q1
+50 : Q2 inside`);
    const m = r.value as WaterfallModel;
    expect(m.series[0].steps[1].labelInside).toBe(true);
    expect(m.valueLabels.inside).toBe(false);
  });

  it("per-step no-label убирает подпись значения", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=40 : Q1 no-label
+50 : Q2`);
    const m = r.value as WaterfallModel;
    const svg = waterfallEngine.render(m, {});
    expect(svg).not.toMatch(/font-size="10"[^>]*>40</);
    expect(svg).toContain(">+50<");
  });

  it("своя подпись значения через label=", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=40 : Q1 label="40 %"
+50 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain("40 %");
  });

  it("ошибка: неизвестный режим labels", () => {
    const r = waterfallEngine.parse(`waterfall
labels сбоку
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/labels above\|inside\|both\|none/i);
  });
});

describe("waterfall: шаг сетки и скрытая ось", () => {
  it("grid задаёт явный шаг делений", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
grid 25
=10 : A
+50 : B`);
    expect(r.ok).toBe(true);
    const m = r.value as WaterfallModel;
    expect(m.axis.gridStep).toBe(25);
    const svg = waterfallEngine.render(m, {});
    for (const tick of ["0", "25", "50", "75", "100"]) {
      expect(svg).toContain(`>${tick}<`);
    }
  });

  it("grid с некруглым шагом", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 30
grid 7.5
=10 : A`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain(">22.5<");
  });

  it("ошибка: неположительный шаг", () => {
    const r = waterfallEngine.parse(`waterfall
grid 0
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/положительный шаг/i);
  });

  it("axis off — нет подписей делений и оси", () => {
    const r = waterfallEngine.parse(`waterfall
y "млн" 0 --> 100
axis off
=10 : A
+50 : B`);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).not.toContain(">млн<");
    expect(svg).not.toContain(">50<");
    // бары на месте
    expect(svg).toContain(">A<");
  });

  it("старые диаграммы рендерятся без изменений", () => {
    const r = waterfallEngine.parse(`waterfall
title Т
y "млн ₽" 0 --> 120
=40 : Q1
+15 : Q2
=55 : Итог`);
    const m = r.value as WaterfallModel;
    expect(m.breaks).toEqual([]);
    expect(m.valueLabels).toEqual({ above: true, inside: false });
    expect(m.axis.gridStep).toBeUndefined();
  });
});

describe("waterfall: «=» без значения (промежуточный итог)", () => {
  it("раскрывается в накопленный итог", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
= : Итого H1
+20 : Q3
= : Итого`);
    expect(r.ok).toBe(true);
    const steps = (r.value as WaterfallModel).series[0].steps;
    expect(steps[2]).toMatchObject({ kind: "absolute", value: 55, label: "Итого H1" });
    expect(steps[4]).toMatchObject({ kind: "absolute", value: 75, label: "Итого" });
  });

  it("повтор подряд не сдвигает итог", () => {
    const r = waterfallEngine.parse(`waterfall
=100 : Старт
= : Повтор
= : Ещё раз`);
    const steps = (r.value as WaterfallModel).series[0].steps;
    expect(steps.map((s) => s.value)).toEqual([100, 100, 100]);
  });

  it("работает с отрицательными шагами", () => {
    const r = waterfallEngine.parse(`waterfall
=100 : Старт
-30 : Расход
= : Остаток`);
    const steps = (r.value as WaterfallModel).series[0].steps;
    expect(steps[2].value).toBe(70);
  });

  it("раскрывает в каждой группе отдельно", () => {
    const r = waterfallEngine.parse(`waterfall-multi
series A
=10 : Старт
+5 : Рост
= : Итог
series B
=100 : Старт
+50 : Рост
= : Итог`);
    expect(r.ok).toBe(true);
    const m = r.value as WaterfallModel;
    expect(m.series[0].steps[2].value).toBe(15);
    expect(m.series[1].steps[2].value).toBe(150);
  });

  it("влияет на автоподсчёт шкалы", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+60 : Q2
= : Итог`);
    const axis = (r.value as WaterfallModel).axis;
    expect(axis.max).toBeGreaterThanOrEqual(100);
  });

  it("ошибка: первая колонка без значения", () => {
    const r = waterfallEngine.parse(`waterfall
= : Старт
+10 : Рост`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/первая колонка/i);
  });

  it("ошибка: «+» и «-» без значения по-прежнему недопустимы", () => {
    for (const sign of ["+", "-"]) {
      const r = waterfallEngine.parse(`waterfall
=10 : A
${sign} : B`);
      expect(r.ok).toBe(false);
      expect(r.errors[0].message).toMatch(/ожидается число/i);
    }
  });

  it("рендерит раскрытое значение подписью", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
= : Итог`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain(">55<");
  });
});

describe("waterfall: соединительные линии", () => {
  it("по умолчанию включены", () => {
    const r = waterfallEngine.parse(`waterfall
=40 : Q1
+15 : Q2
=55 : Итог`);
    expect((r.value as WaterfallModel).connectors).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain('data-connector="1"');
  });

  it("connectors off — линий нет", () => {
    const r = waterfallEngine.parse(`waterfall
connectors off
=40 : Q1
+15 : Q2
=55 : Итог`);
    expect(r.ok).toBe(true);
    expect((r.value as WaterfallModel).connectors).toBe(false);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).not.toContain('data-connector="1"');
  });

  it("connectors on возвращает линии", () => {
    const r = waterfallEngine.parse(`waterfall
connectors off
connectors on
=10 : A
+5 : B`);
    expect((r.value as WaterfallModel).connectors).toBe(true);
  });

  it("число линий = (колонки − 1) × группы", () => {
    const r = waterfallEngine.parse(`waterfall-multi
series A
=10 : A1
+5 : A2
+5 : A3
series B
=20 : B1
+5 : B2
+5 : B3`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const count = (svg.match(/data-connector="1"/g) ?? []).length;
    expect(count).toBe(4);
  });

  it("линия тянется от конца бара к началу следующего", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=40 : Q1
= : Итог`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const m = /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/.exec(svg);
    expect(m).not.toBeNull();
    const [, x1, y1, x2, y2] = m!.map(Number);
    expect(x2).toBeGreaterThan(x1);
    // Уровень не меняется (40 → 40) → линия горизонтальна.
    expect(y1).toBeCloseTo(y2, 3);
  });

  it("линия наклонена, когда уровни разные", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=40 : Q1
+20 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const m = /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/.exec(svg);
    const [, , y1, , y2] = m!.map(Number);
    // Рост 40 → 60: конец второго бара выше (y меньше).
    expect(y2).toBeLessThan(y1);
  });

  it("fontsize задаёт базовый размер шрифта", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
fontsize 16
=40 : Q1
+50 : Q2`);
    expect(r.ok).toBe(true);
    expect((r.value as WaterfallModel).fontSize).toBe(16);
  });

  it("fontsize масштабирует подписи колонок и значения", () => {
    const base = `waterfall
y "" 0 --> 100
=40 : Q1
+50 : Q2`;
    const small = waterfallEngine.render(
      waterfallEngine.parse(`${base}\nfontsize 9`).value as WaterfallModel,
      {},
    );
    const large = waterfallEngine.render(
      waterfallEngine.parse(`${base}\nfontsize 18`).value as WaterfallModel,
      {},
    );
    // Подпись колонки «Q1» рисуется базовым шрифтом.
    expect(small).toMatch(/font-size="9"[^>]*>Q1</);
    expect(large).toMatch(/font-size="18"[^>]*>Q1</);
    // Значения — чуть меньше базового, но тоже растут.
    expect(large).toMatch(/font-size="16"[^>]*>\+50</);
  });

  it("fontsize увеличивает полотно графика", () => {
    const base = `waterfall
y "" 0 --> 100
=40 : Q1
+50 : Q2`;
    const size = (svg: string): number => {
      const m = /width="([\d.]+)" height="([\d.]+)"/.exec(svg);
      return m ? Number(m[1]) * Number(m[2]) : 0;
    };
    const small = waterfallEngine.render(
      waterfallEngine.parse(`${base}\nfontsize 9`).value as WaterfallModel,
      {},
    );
    const large = waterfallEngine.render(
      waterfallEngine.parse(`${base}\nfontsize 18`).value as WaterfallModel,
      {},
    );
    expect(size(large)).toBeGreaterThan(size(small));
  });

  it("fontsize вне диапазона прижимается к 6–28", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
fontsize 100
=40 : Q1
+50 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toMatch(/font-size="28"[^>]*>Q1</);
  });

  it("ошибка: fontsize без числа", () => {
    const r = waterfallEngine.parse(`waterfall
fontsize крупно
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/fontsize <положительное число>/);
  });

  it("ошибка: неизвестное значение директивы", () => {
    const r = waterfallEngine.parse(`waterfall
connectors может быть
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/connectors on.*connectors off/i);
  });
});
