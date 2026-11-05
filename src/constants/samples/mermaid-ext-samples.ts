import type { MermaidExtSampleId } from "@/constants/mermaid-sample-diagrams";

export const MERMAID_EXT_SAMPLES_RU: Record<MermaidExtSampleId, string> = {
  waterfall: `waterfall
%% Базовый водопад: старт, рост, падение, итог.
%% Синтаксис строк данных: <знак><число> : <подпись>
%%   =120 : Q1   абсолютное значение (старт или итог)
%%   = : Итого  «=» без числа — повтор накопленного итога
%%   +180 : Q2   приращение вверх
%%   -60 : Q3    приращение вниз
%% Остальные возможности — в примерах «разрыв шкалы», «несколько серий» и «подписи».
%% ВАЖНО: пунктирные линии между барами — это коннекторы (включены по умолчанию).
%%         Выключить: connectors off
title Выручка 2026
y "млн ₽" 0 --> 500
grid 100
=120 : Q1 старт
+180 : Q2 рост
-60 : Q3 отток
= : Итого H1
+240 : Q4
= : Итог года`,
  waterfallBreak: `waterfall
%% Разрыв шкалы: участок 300..800 ВЫРЕЗАН, чтобы мелкие шаги стали крупнее.
%% Бар, проходящий через разрыв, рисуется кусками с «зигзагом» на линии.
title Выручка с разрывом шкалы
y "млн ₽" 0 --> 1000
grid 100
break 300 --> 800 "разрыв шкалы"
=120 : Q1
+180 : Q2
+700 : Q3
= : Итог`,
  waterfallMulti: `waterfall
%% Несколько серий: у каждой группы свой базовый цвет,
%% рост — светлее на 20%, падение — темнее на 25%.
title План и факт
y "млн ₽" 0 --> 400
grid 100
series План color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Итог
series Факт color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Итог`,
  waterfallLabels: `waterfall
%% ПОДПИСИ И ЛИНИИ — две вещи, которых чаще всего не хватает.
%%
%% 1) ДВЕ ПОДПИСИ НА ОДНОМ БАРЕ (внутри И над) — оба флага в строке данных:
%%      +60 : Q2 inside above
%%    Порядок флагов любой, регистр не важен, флаги — на каждый бар отдельно.
%%    Для всех баров сразу:  labels both
%%    Внутри подпись белая, над баром — серая: они не мешают друг другу.
%%
%% 2) ЛИНИИ между барами — это ДИРЕКТИВА, отдельная строка (не флаг):
%%      connectors on    включить (по умолчанию включены)
%%      connectors off   выключить
%%    Пунктир идёт от рабочего края бара к следующему:
%%    рост — от верха, падение — от низа. Если уровни разные — ступенькой.
%%
%% 3) Своя подпись значения:  label="+60 млн"
%%    Без подписи вообще:      no-label
%%
%% 4) Цвета: colors total= increase= decrease=
title Подписи и линии
y "млн ₽" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 млн"
-25 : Q3 above
= : Итог inside above`,
  waterfallNoLines: `waterfall
%% ЛИНИИ ВЫКЛЮЧЕНЫ — тот же водопад, что в примере «подписи и линии»,
%% но без пунктирных соединителей: чистая презентационная картинка.
%%
%% Разница — одна строка:  connectors off
%% (по умолчанию линии включены, поэтому «off» нужно писать явно)
%%
%% Сравни с примером «Водопад — подписи и линии»:
%% там connectors on и те же самые данные.
title Подписи без линий
y "млн ₽" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 млн"
-25 : Q3 above
= : Итог inside above`,
  waterfallThresholds: `waterfall
%% ГОРИЗОНТАЛЬНЫЕ ЛИНИИ С ПРИМЕРОМ — уровень плана, цель, порог.
%%
%% Директива — ОТДЕЛЬНАЯ строка (не флаг в строке данных):
%%   line <значение> ["подпись"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "план"                 пунктир по умолчанию, цвет темы
%%   line 400 "цель" color=#cf222e   свой цвет
%%   line 250 "порог" style=dot width=1
%%
%% Линия рисуется по всей ширине графика, подпись — справа от последнего
%% бара, с вырезом под текст (линия её не перечёркивает).
%% Линий можно сколько угодно: каждая — своя строка.
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
= : Итог года`,
  waterfallMono: `waterfall
%% Чёрно-белый режим: цвета не нужны, бары различаются светлотой.
%% Полезно для печати и для документов без цвета.
%% Свои цвета можно задать и здесь — они перекроют серую шкалу.
title Ч/Б режим (mono)
mono
y "млн ₽" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : Итого H1
+110 : Q4
= : Итог года`,
  bubble: `bubble
%% Демо всех возможностей bubble: оси x/y, легенда размера,
%% квадранты и их подписи, группы-цвета и размер шрифта.
%% Подпись внутри пузырька, если влезает; иначе под ним, целиком, без «…».
title BCG матрица: подписи целиком
x "Доля рынка" 0 --> 10
y "Рост рынка, %" 0 --> 30
size "Выручка"
quadrants Звёзды, Вопросы, Дойные коровы, Собаки
mid x=5 y=12
fontsize 12
data
Продукт A : x=8.2, y=22, size=340, group=Software
Продукт B : x=2.1, y=25, size=180, group=Software
Продукт C : x=7.4, y=4, size=520, group=Hardware
Продукт D : x=1.5, y=3, size=90, group=Hardware
Продукт E : x=4.6, y=16.5, size=240, group=Software`,
  heatmap: `heatmap
title Нагрузка по дням
x Пн, Вт, Ср, Чт, Пт
y Утро, День, Вечер
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Утро : 20, 35, 50, 30, 25
День : 60, 75, 85, 70, 55
Вечер : 40, 45, 65, 50, 35`,
  orgchart: `orgchart
%% Заливка — color=#hex (fill=). Граница — border=#hex и style=solid|dash|dot|dashdot.
%% Ключи можно сочетать и менять местами. Внутри [скобок] color= остаётся текстом.
Гендиректор [Генеральный директор\\nИван Петров] color=#8250df
Техдир [Технический директор\\nАнна Смирнова] color=#ddf4ff border=#0969da
Финдир [Финансовый директор\\nОльга Орлова] border=#9a6700 style=dash
Бэкенд [Руководитель серверной разработки\\nСергей Волков]
Фронтенд [Руководитель клиентской разработки\\nМария Соколова]
Гендиректор -> Техдир
Гендиректор -> Финдир
Техдир -> Бэкенд
Техдир -> Фронтенд
Финдир -.-> Бэкенд`,
  ev: `ev
title Освоение бюджета
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
};

export const MERMAID_EXT_SAMPLES_EN: Record<MermaidExtSampleId, string> = {
  waterfall: `waterfall
%% Basic waterfall: start, growth, decline, total.
%% Data rows: <sign><number> : <label>
%%   =120 : Q1   absolute value (start or total)
%%   = : H1 total  bare "=" — repeats the running total
%%   +180 : Q2   increase
%%   -60 : Q3    decrease
%% More features: samples "axis break", "multiple series", "labels".
%% NOTE: the dashed lines between bars are connectors (default on).
%%       Turn them off with: connectors off
title Revenue 2026
y "M USD" 0 --> 500
grid 100
=120 : Q1 start
+180 : Q2 growth
-60 : Q3 churn
= : H1 total
+240 : Q4
= : Year total`,
  waterfallBreak: `waterfall
%% Axis break: the 300..800 span is CUT so small steps become bigger.
%% A bar crossing the break is drawn in pieces with a zigzag on the line.
title Revenue with axis break
y "M USD" 0 --> 1000
grid 100
break 300 --> 800 "axis break"
=120 : Q1
+180 : Q2
+700 : Q3
= : Total`,
  waterfallMulti: `waterfall
%% Multiple series: each group has its own base colour,
%% increases 20% lighter, decreases 25% darker.
title Plan vs actual
y "M USD" 0 --> 400
grid 100
series Plan color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Total
series Actual color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Total`,
  waterfallLabels: `waterfall
%% LABELS AND LINES — the two things people miss most.
%%
%% 1) TWO LABELS ON ONE BAR (inside AND above) — write both flags in the row:
%%      +60 : Q2 inside above
%%    Flags are per-bar, order-independent, case-insensitive.
%%    For every bar at once:  labels both
%%    The inside label is white, the one above the bar is grey — they never clash.
%%
%% 2) LINES between bars are a DIRECTIVE on its own line (not a flag):
%%      connectors on    enable (on by default)
%%      connectors off   disable
%%    The dashed line runs from the working edge of a bar to the next one:
%%    growth — from the top, decline — from the bottom. Different levels
%%    are joined with a step.
%%
%% 3) Custom value label:  label="+60 M"
%%    No label at all:     no-label
%%
%% 4) Colours: colors total= increase= decrease=
title Labels and lines
y "M USD" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 M"
-25 : Q3 above
= : Total inside above`,
  waterfallNoLines: `waterfall
%% LINES OFF — the very same waterfall as "labels and lines",
%% but without the dashed connectors: a clean presentation picture.
%%
%% The only difference is one line:  connectors off
%% (connectors are on by default, so "off" must be written explicitly)
%%
%% Compare with the "Waterfall — labels and lines" sample:
%% it has connectors on and exactly the same data.
title Labels without lines
y "M USD" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 M"
-25 : Q3 above
= : Total inside above`,
  waterfallThresholds: `waterfall
%% HORIZONTAL LINES WITH A LABEL — plan level, target, threshold.
%%
%% The directive lives on its OWN line (not a flag in a data row):
%%   line <value> ["label"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "plan"                 dashed by default, theme colour
%%   line 400 "target" color=#cf222e custom colour
%%   line 250 "threshold" style=dot width=1
%%
%% A line spans the whole plot, its label sits to the right of the last bar
%% with a knockout so the line never strikes through the text.
%% As many lines as you like — one line each.
title Revenue vs plan
y "M USD" 0 --> 500
grid 100
line 350 "plan"
line 400 "target" color=#cf222e width=2
line 250 "threshold" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : H1 total
+240 : Q4
= : Year total`,
  waterfallMono: `waterfall
%% Black-and-white mode: no colours needed, bars differ by lightness.
%% Handy for print and for documents without colour.
%% Custom colours still work here — they override the grey scale.
title Mono mode (black & white)
mono
y "M USD" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : H1 total
+110 : Q4
= : Year total`,
  bubble: `bubble
%% Demo of every bubble feature: x/y axes, size legend, quadrants
%% and their labels, colour groups and font size.
%% A label stays inside the bubble when it fits; otherwise it sits below, uncut, no "…".
title BCG matrix: full labels
x "Market share" 0 --> 10
y "Market growth, %" 0 --> 30
size "Revenue"
quadrants Stars, Question marks, Cash cows, Dogs
mid x=5 y=12
fontsize 12
data
Product A : x=8.2, y=22, size=340, group=Software
Product B : x=2.1, y=25, size=180, group=Software
Product C : x=7.4, y=4, size=520, group=Hardware
Product D : x=1.5, y=3, size=90, group=Hardware
Product E : x=4.6, y=16.5, size=240, group=Software`,
  heatmap: `heatmap
title Load by day
x Mon, Tue, Wed, Thu, Fri
y Morning, Day, Evening
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Morning : 20, 35, 50, 30, 25
Day : 60, 75, 85, 70, 55
Evening : 40, 45, 65, 50, 35`,
  orgchart: `orgchart
%% Fill is color=#hex (or fill=). Border is border=#hex and style=solid|dash|dot|dashdot.
%% Keys combine in any order. Inside [brackets] color= stays part of the label.
CEO [Chief executive officer\\nAlex Morgan] color=#8250df
CTO [Chief technology officer\\nElena Chen] color=#ddf4ff border=#0969da
CFO [Chief financial officer\\nDavid Miller] border=#9a6700 style=dash
Backend [Head of backend engineering\\nSamir Patel]
Frontend [Head of frontend engineering\\nClaire Dubois]
CEO -> CTO
CEO -> CFO
CTO -> Backend
CTO -> Frontend
CFO -.-> Backend`,
  ev: `ev
title Budget earned value
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
};
