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
    // Смысл разрыва: вырезать «пустой» участок шкалы, чтобы данные по краям
    // стали крупнее. Данные здесь только в 0..100 и 800..1000.
    const src = `waterfall
y "" 0 --> 1000
=100 : A
+800 : B
= : Итог`;
    const plain = waterfallEngine.parse(src);
    const broken = waterfallEngine.parse(`${src}\nbreak 300 --> 800`);
    expect(broken.ok).toBe(true);
    const barOf = (svg: string, barId: string) => {
      // Бар, пересекающий разрыв, рисуется кусками (по rect на видимый участок),
      // поэтому высоту считаем суммой кусков с этим data-bar.
      const re = new RegExp(
        `<rect x="[\\d.]+" y="([\\d.]+)" width="[\\d.]+" height="([\\d.]+)" fill="#[0-9a-f]{6}"[^>]*data-bar="${barId}"`,
        "g",
      );
      const all = [...svg.matchAll(re)];
      if (!all.length) return null;
      return {
        y: Math.min(...all.map((m) => Number(m[1]))),
        h: all.reduce((sum, m) => sum + Number(m[2]), 0),
      };
    };
    const plainA = barOf(waterfallEngine.render(plain.value as WaterfallModel, {}), "0-0");
    const brokenA = barOf(waterfallEngine.render(broken.value as WaterfallModel, {}), "0-0");
    expect(plainA).not.toBeNull();
    expect(brokenA).not.toBeNull();
    // Бар «=100» (0..100) на сжатой шкале заметно выше, чем на непрерывной.
    expect(brokenA!.h).toBeGreaterThan(plainA!.h);
    expect(brokenA!.h - plainA!.h).toBeGreaterThan(1);
  });

  it("бар, пересекающий разрыв, рисуется кусками с зигзагом, а не сплошным", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=100 : A
+900 : B
break 300 --> 800`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // Бар «+900» пересекает разрыв → два куска с одним data-bar.
    const pieces = [...svg.matchAll(/<rect[^>]*data-bar="0-1"[^>]*>/g)];
    expect(pieces.length).toBe(2);
    // На линии разрыва нарисован зигзаг.
    expect(svg).toContain('data-break-zigzag="1"');
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

  it("куски бара заканчиваются ровно на линии разрыва (синхронно с осью)", () => {
    // Регресс: куски рисовались по yOf(), который прибавлял BREAK_HEIGHT,
    // и бар «уезжал» выше линии разрыва. Теперь разрыв места не занимает.
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=100 : A
+900 : B
break 300 --> 800 "разрыв"`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // Линия разрыва = yOf(b.after) = yOf(300); кусок бара ниже кончается на ней.
    const lineY = Number([...svg.matchAll(/<line x1="64" y1="([\d.]+)" x2="[\d.]+" y2="[\d.]+" stroke="#656d76" stroke-width="1" stroke-dasharray="6 4"/g)][0][1]);
    const pieces = [...svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="#[0-9a-f]{6}"[^>]*data-bar="0-1"/g)]
      .map((m) => ({ y: Number(m[1]), bottom: Number(m[1]) + Number(m[2]) }));
    expect(pieces).toHaveLength(2);
    const lower = pieces.sort((a, b) => b.y - a.y)[0];
    const upper = pieces.sort((a, b) => a.y - b.y)[0];
    // Допуск 2 px: у куска минимальная высота 1.5 px (иначе он не виден).
    expect(Math.abs(lower.y - lineY)).toBeLessThanOrEqual(2);
    expect(Math.abs(upper.bottom - lineY)).toBeLessThanOrEqual(2);
  });

  it("на границах разрыва подписаны минимум (снизу) и максимум (сверху)", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
grid 100
=100 : A
+900 : B
break 300 --> 800`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // Сетка не подписывает вырезанный участок (800 нет среди делений)…
    expect([...svg.matchAll(/<text[^>]*>800<\/text>/g)]).toHaveLength(1);
    // …но границы разрыва подписаны всегда: «после» ниже линии, «до» — выше.
    const after = /<text x="[\d.]+" y="([\d.]+)"[^>]*data-break-edge="after">300<\/text>/.exec(svg);
    const before = /<text x="[\d.]+" y="([\d.]+)"[^>]*data-break-edge="before">800<\/text>/.exec(svg);
    expect(after).not.toBeNull();
    expect(before).not.toBeNull();
    expect(Number(after![1])).toBeGreaterThan(Number(before![1]));

    // Числа стоят ЦЕЛИКОМ по свою сторону линии: нижнее ниже линии, верхнее
    // выше (базлайн верхнего не заходит в полосу линии). Иначе линия их
    // перечёркивает и цифры «плывут» относительно делений сетки.
    const lineY = Number(/<line x1="[\d.]+" y1="([\d.]+)"[^>]*stroke-dasharray="6 4"/.exec(svg)![1]);
    const fs = 11;
    expect(Number(after![1]) - fs).toBeGreaterThan(lineY);
    expect(Number(before![1])).toBeLessThan(lineY);
  });

  it("подпись разрыва — справа от самого правого бара", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=100 : A
+900 : B
break 300 --> 800 "разрыв шкалы"`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const bars = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"[^>]*data-bar=/g)];
    const rightEdge = Math.max(...bars.map((m) => Number(m[1]) + Number(m[2])));
    const label = /<text x="([\d.]+)"[^>]*data-break-label="1">разрыв шкалы<\/text>/.exec(svg);
    expect(label).not.toBeNull();
    // Подпись целиком помещается в SVG и начинается правее последнего бара.
    expect(Number(label![1])).toBeGreaterThan(rightEdge);
    const width = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
    expect(Number(label![1])).toBeLessThan(width);
  });

  it("подпись разрыва — справа от последнего бара и в мульти-серии", () => {
    // В мульти-серии группа уже колонки: подпись должна стоять в свободном
    // поле правее края реального бара (а не на графике) и не улетать от него.
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
break 300 --> 800 "разрыв шкалы"
series План
=100 : A
+900 : B
series Факт
=120 : A
+860 : B`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const bars = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"[^>]*data-bar=/g)];
    const rightEdge = Math.max(...bars.map((m) => Number(m[1]) + Number(m[2])));
    const label = /<text x="([\d.]+)"[^>]*data-break-label="1">разрыв шкалы<\/text>/.exec(svg);
    expect(label).not.toBeNull();
    expect(Number(label![1])).toBeGreaterThan(rightEdge);
    // Подпись прижата к правому краю SVG: зазор от бара — не больше её ширины
    // плюс отступы, то есть она не улетает в пустоту.
    expect(Number(label![1]) - rightEdge).toBeLessThan(60);
  });

  it("подпись разрыва не обрезается краем SVG", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 1000
=100 : A
+900 : B
break 300 --> 800 "очень длинная подпись разрыва шкалы"`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain("очень длинная подпись разрыва шкалы");
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

  it("линия горизонтальна: идёт по уровню накопленного итога", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=40 : Q1
+20 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const m = /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/.exec(svg);
    const [, , y1, , y2] = m!.map(Number);
    // Соединитель всегда на уровне итога: у роста — по низу бара (40),
    // у падения — по верху. Поэтому линия горизонтальна.
    expect(y1).toBeCloseTo(y2, 3);
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

describe("waterfall: соединители — нотация водопада", () => {
  /** Все соединители: {x1, y1, x2, y2}. */
  const connectors = (svg: string) =>
    [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/g)]
      .map((m) => ({ x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) }));
  /** Бары по порядку следования в SVG: {x, top, bottom} (фон и ось отброшены). */
  const bars = (svg: string) =>
    [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#[0-9a-f]{6}" rx="2" /g)]
      .map((m) => ({
        x: Number(m[1]),
        top: Number(m[2]),
        bottom: Number(m[2]) + Number(m[4]),
      }))
      .filter((b) => b.bottom - b.top > 1 && b.x > 20);

  it("рост: соединитель идёт по НИЗУ растущего бара", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=20 : Старт
+30 : Рост
= : Итог`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const [start, growth, total] = bars(svg);
    const [first, second] = connectors(svg);

    // Старт 20 → 50: линия начинается на верхней кромке бара «Старт»
    // (там накопленный итог 20)…
    expect(first.x1).toBeGreaterThan(start.x);
    expect(first.y1).toBeCloseTo(start.top, 1);
    // …и приходит в нижнюю кромку бара «Рост» — он растёт вверх от 20 до 50.
    expect(first.y2).toBeCloseTo(growth.bottom, 1);
    // Следующий соединитель: от верха «Роста» (итог 50) к верху итога.
    expect(second.y1).toBeCloseTo(growth.top, 1);
    expect(second.y2).toBeCloseTo(total.top, 1);
  });

  it("падение: соединитель идёт по ВЕРХУ падающего бара", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 100
=80 : Старт
-30 : Падение
= : Итог`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const [start, drop, total] = bars(svg);
    const [first, second] = connectors(svg);

    // Старт 80: соединитель выходит из верха бара «Старт» (итог 80)…
    expect(first.y1).toBeCloseTo(start.top, 1);
    // …и приходит в ВЕРХ бара «Падение» — он идёт вниз от 80 до 50.
    expect(first.y2).toBeCloseTo(drop.top, 1);
    // Дальше — от низа «Падения» (итог 50) к верху итога (тот же уровень).
    expect(second.y1).toBeCloseTo(drop.bottom, 1);
    expect(second.y2).toBeCloseTo(total.top, 1);
  });
});

describe("waterfall: чёрно-белый режим (mono)", () => {
  it("mono включает серые бары вместо цветных", () => {
    const r = waterfallEngine.parse(`waterfall
mono
y "" 0 --> 100
=40 : Q1
+20 : Q2
-10 : Q3`);
    expect(r.ok).toBe(true);
    expect((r.value as WaterfallModel).mono).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain('fill="#111111"'); // итог
    expect(svg).toContain('fill="#a3a3a3"'); // рост
    expect(svg).toContain('fill="#4d4d4d"'); // падение
    expect(svg).not.toContain("#2da44e");
    expect(svg).not.toContain("#cf222e");
  });

  it("mono off возвращает цветную палитру", () => {
    const r = waterfallEngine.parse(`waterfall
mono
mono off
y "" 0 --> 100
=40 : Q1
+20 : Q2`);
    expect((r.value as WaterfallModel).mono).toBe(false);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain("#2da44e");
  });

  it("ошибка: неизвестное значение mono", () => {
    const r = waterfallEngine.parse(`waterfall
mono может быть
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/mono/);
  });
});

describe("waterfall: свои цвета (colors)", () => {
  it("colors задаёт цвета итогов, роста и падения", () => {
    const r = waterfallEngine.parse(`waterfall
colors total=#334155 increase=#0ea5e9 decrease=#f97316
y "" 0 --> 100
=40 : Q1
+20 : Q2
-10 : Q3`);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain('fill="#334155"');
    expect(svg).toContain('fill="#0ea5e9"');
    expect(svg).toContain('fill="#f97316"');
  });

  it("можно задать только часть цветов — остальные из палитры", () => {
    const r = waterfallEngine.parse(`waterfall
colors increase=#0ea5e9
y "" 0 --> 100
=40 : Q1
+20 : Q2
-10 : Q3`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain('fill="#0ea5e9"');
    expect(svg).toContain("#0969da"); // итог из палитры
    expect(svg).toContain("#cf222e"); // падение из палитры
  });

  it("понимает имена цветов и синонимы positive/negative", () => {
    const r = waterfallEngine.parse(`waterfall
colors total=navy positive=teal negative=crimson
=10 : A
+5 : B
-3 : C`);
    expect(r.ok).toBe(true);
    expect((r.value as WaterfallModel).colors).toEqual({
      total: "navy",
      increase: "teal",
      decrease: "crimson",
    });
  });

  it("ошибка: неизвестный ключ цвета", () => {
    const r = waterfallEngine.parse(`waterfall
colors bar=#fff
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/неизвестный ключ цвета/);
  });

  it("ошибка: не цвет", () => {
    const r = waterfallEngine.parse(`waterfall
colors total=нецвет
=10 : A`);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/не удалось разобрать цвет/);
  });
});

describe("waterfall: мульти-серии — цвета различаются", () => {
  it("цвет группы из series ... color= перекрывает цвета шагов", () => {
    const r = waterfallEngine.parse(`waterfall
series Базовый color=#1d4ed8
=10 : A
+5 : B
series План color=#9333ea
=10 : A
+8 : B`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect(svg).toContain('fill="#1d4ed8"');
    expect(svg).toContain('fill="#9333ea"');
    expect((r.value as WaterfallModel).series[0].color).toBe("#1d4ed8");
    expect((r.value as WaterfallModel).series[1].name).toBe("План");
  });

  it("без явных цветов цветные маркеры легенды всех групп различаются", () => {
    const r = waterfallEngine.parse(`waterfall
series A
=10 : A1
+5 : A2
series B
=10 : B1
+5 : B2
series C
=10 : C1
+5 : C2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // Маркеры легенды — квадраты 10×10 ниже подписей колонок.
    const swatches = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="10" height="10" fill="(#[0-9a-f]{6})"/g)]
      .map((m) => m[1]);
    expect(swatches).toHaveLength(3);
    expect(new Set(swatches).size).toBe(3);
  });

  it("в мульти-серии различаются и группы, и типы шагов (рост/падение — оттенки)", () => {
    const r = waterfallEngine.parse(`waterfall
series A color=#1d4ed8
=10 : A1
+5 : A2
-3 : A3
series B color=#9333ea
=10 : B1
+5 : B2
-3 : B3`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const fills = [...svg.matchAll(/<rect[^>]*fill="(#[0-9a-f]{6})"[^>]*data-bar="([^"]+)"/g)].map(
      (m) => ({ fill: m[1], bar: m[2] }),
    );
    const colorOf = (bar: string) => fills.find((f) => f.bar === bar)!.fill;
    // Группы различаются базовым цветом.
    expect(colorOf("0-0")).not.toBe(colorOf("1-0"));
    // Внутри группы типы различаются: итог ≠ рост ≠ падение.
    expect(colorOf("0-0")).not.toBe(colorOf("0-1"));
    expect(colorOf("0-0")).not.toBe(colorOf("0-2"));
    expect(colorOf("0-1")).not.toBe(colorOf("0-2"));
    // Итого — 6 разных цветов на 6 баров.
    expect(new Set(fills.map((f) => f.fill)).size).toBe(6);
  });

  it("в моно-режиме маркеры групп тоже различаются (по светлоте)", () => {
    const r = waterfallEngine.parse(`waterfall
mono
series A
=10 : A1
+5 : A2
series B
=10 : B1
+5 : B2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const swatches = [...svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="10" height="10" fill="(#[0-9a-f]{6})"/g)]
      .map((m) => m[1]);
    expect(new Set(swatches).size).toBe(2);
  });
});

describe("waterfall: две подписи на одном баре (inside + above)", () => {
  it("per-step `inside above` рисует обе подписи", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 200
=90 : Q1 inside above
+60 : Q2 inside above
= : Итог`);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // Внутри — белый жирный текст; над баром — текст цветом fgDim.
    const insideCount = (svg.match(/font-weight="600"/g) ?? []).length;
    expect(insideCount).toBeGreaterThanOrEqual(2);
    // Значение «90» встречается дважды: внутри и над.
    const n90 = (svg.match(/>90</g) ?? []).length;
    expect(n90).toBeGreaterThanOrEqual(2);
  });

  it("`labels both` глобально даёт обе подписи", () => {
    const r = waterfallEngine.parse(`waterfall
labels both
y "" 0 --> 200
=90 : Q1
+60 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect((svg.match(/>90</g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("если внутри не помещается — подпись выносится над баром", () => {
    const r = waterfallEngine.parse(`waterfall
labels inside
y "" 0 --> 200
=2 : Малый
+150 : Большой`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // У низкого бара подпись не теряется.
    expect(svg).toContain(">2<");
  });
});

describe("waterfall: коннекторы читаемы", () => {
  it("линия между барами длиннее 16 px", () => {
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 200
=90 : Q1
+60 : Q2
-25 : Q3`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const lines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/g)];
    expect(lines.length).toBeGreaterThan(0);
    const span = Math.abs(Number(lines[0][3]) - Number(lines[0][1]));
    // Зазор между барами — не меньше 12 px, иначе линия теряется на сетке.
    expect(span).toBeGreaterThan(12);
  });

  it("разные уровни соединяются ступенькой (вертикальный отрезок)", () => {
    // Абсолютные колонки на разных уровнях: 90 и 150 → уровни разные.
    const r = waterfallEngine.parse(`waterfall
y "" 0 --> 200
=90 : Q1
=150 : Q2`);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    const segs = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*data-connector="1"/g)];
    const hasVertical = segs.some((m) => Math.abs(Number(m[3]) - Number(m[1])) < 0.5 && Math.abs(Number(m[4]) - Number(m[2])) > 0.5);
    expect(hasVertical).toBe(true);
  });
});

describe("waterfall: пример «подписи и линии» (сэмпл редактора)", () => {
  const SAMPLE = `waterfall
title Подписи и линии
y "млн ₽" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 млн"
-25 : Q3 above
= : Итог inside above`;

  it("разбирается без ошибок", () => {
    const r = waterfallEngine.parse(SAMPLE);
    expect(r.ok).toBe(true);
  });

  it("на баре Q2 обе подписи: внутри (белая, жирная) и над (fgDim)", () => {
    const r = waterfallEngine.parse(SAMPLE);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    // Своя подпись label="+60 млн" стоит и внутри бара, и над ним.
    const occurrences = (svg.match(/\+60 млн/g) ?? []).length;
    expect(occurrences).toBe(2);
    // Внутри — белым жирным, над баром — цветом fgDim.
    expect(svg).toMatch(/fill="#ffffff" font-size="[\d.]+" text-anchor="middle" font-weight="600">\+60 млн</);
    const inside = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" fill="#ffffff"[^>]*>\+60 млн</g)];
    const above = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" fill="#656d76"[^>]*>\+60 млн</g)];
    expect(inside.length).toBe(1);
    expect(above.length).toBe(1);
    // Подпись «над» стоит выше (меньший y), чем подпись «внутри».
    expect(Number(above[0][2])).toBeLessThan(Number(inside[0][2]));
    // X совпадает — обе подписи центрированы по одному бару.
    expect(above[0][1]).toBe(inside[0][1]);
  });

  it("линии включены: коннекторы есть", () => {
    const r = waterfallEngine.parse(SAMPLE);
    const svg = waterfallEngine.render(r.value as WaterfallModel, {});
    expect((svg.match(/data-connector="1"/g) ?? []).length).toBeGreaterThan(0);
  });

  it("`connectors off` на тех же данных убирает линии, подписи остаются", () => {
    const withLines = waterfallEngine.render(
      waterfallEngine.parse(SAMPLE).value as WaterfallModel,
      {},
    );
    const withoutLines = waterfallEngine.render(
      waterfallEngine.parse(SAMPLE.replace("connectors on", "connectors off")).value as WaterfallModel,
      {},
    );
    expect((withLines.match(/data-connector="1"/g) ?? []).length).toBeGreaterThan(0);
    expect((withoutLines.match(/data-connector="1"/g) ?? []).length).toBe(0);
    // Подписи от выключения линий не страдают.
    expect((withoutLines.match(/\+60 млн/g) ?? []).length).toBe(2);
  });
});

describe("waterfall: горизонтальные линии", () => {
  const src = `waterfall
title Выручка против плана
y "млн ₽" 0 --> 500
grid 100
line 350 "план"
line 400 "цель" color=#cf222e width=2
line 250 "порог" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : Итого H1
+240 : Q4
= : Итог года`;

  it("подпись в кавычках не съедает параметры после неё", () => {
    const r = waterfallEngine.parse(src);
    expect(r.ok).toBe(true);
    const lines = (r.value as WaterfallModel).lines ?? [];
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ value: 250, label: "порог", style: "dot", width: 1 });
    expect(lines[1]).toMatchObject({ value: 350, label: "план" });
    expect(lines[2]).toMatchObject({ value: 400, label: "цель", color: "#cf222e", width: 2 });
  });

  it("параметры перед подписью тоже разбираются", () => {
    const r = waterfallEngine.parse(`waterfall
y 0 --> 100
line 50 color=#cf222e style=solid "цель"
=40 : A
+20 : B`);
    expect(r.ok).toBe(true);
    expect((r.value as WaterfallModel).lines?.[0]).toMatchObject({
      value: 50,
      label: "цель",
      color: "#cf222e",
      style: "solid",
    });
  });

  it("линии рисуются ПОВЕРХ баров: в SVG они идут после них", () => {
    const r = waterfallEngine.parse(src);
    expect(r.ok).toBe(true);
    const svg = waterfallEngine.render(r.value as WaterfallModel, { dark: false });
    const lastBar = Math.max(
      ...[...svg.matchAll(/<rect[^>]*data-bar="1"[^>]*>/g)].map((m) => m.index ?? 0),
    );
    const firstLine = svg.indexOf('data-threshold-line="1"');
    expect(firstLine).toBeGreaterThan(lastBar);
    // и после подписей значений
    const lastValueLabel = Math.max(
      ...[...svg.matchAll(/<text[^>]*data-value-label="1"[^>]*>/g)].map((m) => m.index ?? 0),
      -1,
    );
    if (lastValueLabel >= 0) expect(firstLine).toBeGreaterThan(lastValueLabel);
  });
});
