import type { MermaidExtSampleId } from "@/constants/mermaid-sample-diagrams";
import { HISTOGRAM_SAMPLES_EN, HISTOGRAM_SAMPLES_RU } from "@/constants/samples/histogram-gallery-samples";

export const MERMAID_EXT_SAMPLES_RU: Record<MermaidExtSampleId, string> = {
  ...HISTOGRAM_SAMPLES_RU,
  waterfall: `waterfall
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
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
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
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
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
%% Несколько серий: у каждой группы свой базовый цвет,
%% рост — светлее на 20%, падение — темнее на 25%.
%% gap 16% — доля пустого места. gap 8 задаёт тот же просвет в пикселях.
title План и факт
y "млн ₽" 0 --> 400
grid 100
gap 16%
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
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
%% ПОДПИСИ И ЛИНИИ — две вещи, которых чаще всего не хватает.
%%
%% 1) inside и above — куда писать подпись значения.
%%    Флаги в конце строки данных, порядок любой, регистр не важен.
%%    Указан только один — вторая позиция не рисуется и не дублирует первую:
%%      =90 : Q1 inside          только внутри (над баром пусто)
%%      -25 : Q3 above           только над баром
%%    Вместе — можно, и тексты могут быть разными:
%%      +60 : Q2 inside="60" above="+60 млн"
%%    Обе позиции с одним и тем же числом:
%%      = : Итог inside above
%%    Для всех баров сразу:  labels inside | above | both | none
%%    labels fontcolor auto красит число контрастом к фону под ним: внутри — заливка бара, снаружи — холст. labels fontcolor #1f2328 задаёт свой цвет. Без fontcolor внутри белый, снаружи серый.
%%    Если текст не влезает внутрь, он переносится над бар одной копией.
%%
%% 2) ЛИНИИ между барами — это ДИРЕКТИВА, отдельная строка (не флаг):
%%      connectors on    включить (по умолчанию включены)
%%      connectors off   выключить
%%    Пунктир идёт от рабочего края бара к следующему:
%%    рост — от верха, падение — от низа. Если уровни разные — ступенькой.
%%
%% 3) Общий текст, если у позиции нет своего:  label="+60 млн"
%%    Без подписи вообще:                       no-label
%%
%% 4) Цвета: colors total= increase= decrease=
title Подписи и линии
y "млн ₽" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
labels fontcolor auto
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 млн"
-25 : Q3 above
= : Итог inside above`,
  waterfallNoLines: `waterfall
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
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
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 млн"
-25 : Q3 above
= : Итог inside above`,
  waterfallThresholds: `waterfall
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
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
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи колонок. Следующий grid возвращает линии без подписей. grid off прячет только сетку.
%% Зазор: gap 12 — пиксели между барами и колонками, gap 20% — доля пустого места. Второй оси и суммы стопки нет.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри бара фон — заливка, снаружи — холст. Без fontcolor внутри белый, снаружи серый.
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
  boxplot: `boxplot
%% Ящик с усами (Box plot): распределение, квартили Q1/Q2/Q3, усы и выбросы.
%% Два способа задать данные категории:
%%   1) Готовые квантили: Категория : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) Сырая выборка:    Категория : values=20, 28, 35, 42, 50, 62, 145 color=#hex (квартили и выбросы по Тьюки)
%% Опции работы с цветом:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — чёрно-белый режим для печати
title Время отклика сервисов
y "мс" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
API шлюз : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
Платежи : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
Поиск : values=12, 22, 28, 34, 38, 45, 52, 68, 148
Аналитика : 30, 55, 78, 110, 155 color=#0f766e`,
  treemap: `treemap
%% Древовидная карта (Tree map): площадь каждого блока пропорциональна весу.
%% Синтаксис строк: Группа / Элемент : <вес> [color=#hex]
%% Директива labels: values | percent | both | none (по умолчанию both — вес и доля в %).
%% Опции цвета: colors s1=#hex s2=#hex ..., color=#hex у элемента или группы, либо mono.
title ИТ-бюджет по направлениям (млн ₽)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
Инфраструктура / Облако и K8s : 420
Инфраструктура / Сеть и CDN : 180
Инфраструктура / Хранилища : 140
Разработка / Бэкенд и API : 360
Разработка / Веб и мобильные : 260
Разработка / QA и автотесты : 140
Данные и ИИ / Хранилище DWH : 240
Данные и ИИ / ML-модели : 160 color=#0f766e`,
  radar: `radar
%% Лепестковая / паутинная диаграмма (Radar): сравнение серий по N >= 3 осям.
%% Директивы:
%%   axes Ось 1, Ось 2, ...   список лучей (минимум 3)
%%   scale 0 --> 100          шкала значений
%%   rings 5                  число концентрических колец сетки
%%   fill 0.22                прозрачность заливки (0..1 или off)
%%   dots on|off              точки на вершинах
%%   colors s1=#hex s2=#hex   палитра серий (или color=#hex в строке серии, или mono)
title Сравнение облачных платформ
axes Производительность, Надёжность, Безопасность, Удобство DX, Экосистема, Стоимость
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series Платформа А : 90, 92, 88, 82, 95, 70
series Платформа Б : 78, 85, 94, 90, 80, 86
series Платформа В : 84, 76, 80, 88, 74, 92 color=#f97316`,
  voronoi: `voronoi
%% Диаграмма Вороного (Voronoi tessellation): разбивает плоскость на ячейки ближайших центров.
%% Директивы:
%%   x "подпись" min --> max   ось X (по умолчанию 0 --> 100)
%%   y "подпись" min --> max   ось Y (по умолчанию 0 --> 100)
%%   sites on|off              рисовать точки-центры
%%   labels on|off             рисовать подписи внутри ячеек
%%   colors s1=#hex s2=#hex    цвета групп/ячеек (или color=#hex у точки, или mono)
title Зоны покрытия логистических хабов
x "Запад — Восток, км" 0 --> 100
y "Юг — Север, км" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
Северный хаб : x=48, y=82, group=Магистраль
Южный хаб : x=52, y=18, group=Магистраль
Западный терминал : x=20, y=54, group=Регион
Восточный терминал : x=82, y=56, group=Регион
Центральный склад : x=50, y=50, group=Центр
Юго-Запад : x=24, y=22, group=Регион, color=#f97316`,
  clustered: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Серийная диаграмма: столбцы нескольких серий по категориям.
%% Несколько серий рисуются рядом в каждой категории.
%% Повернуть диаграмму на 90 градусов (горизонтальные полосы): добавьте строку rotate 90
%% Директивы:
%%   categories К1, К2, ...    категории по оси (синоним: x К1, К2, ...)
%%   y "подпись" min --> max   шкала значений
%%   labels above|inside|none  подписи чисел
%%   colors s1=#hex s2=#hex    цвета серий (или color=#hex в строке series, или mono)
title Выручка по каналам продаж
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 200
grid 50
gap 15%
labels above fontcolor auto
colors s1=#0969da s2=#8250df s3=#2da44e
series Онлайн : 120, 145, 165, 190
series Розница : 85, 95, 110, 130
series Партнёры : 45, 60, 75, 95 color=#f97316`,
  clusteredRotated: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Серийная диаграмма С ПОВОРОТОМ НА 90 ГРАДУСОВ (rotate 90).
%% Директива rotate 90 (или orientation horizontal) разворачивает оси:
%% категории идут сверху вниз слева, а полосы серий растут слева направо.
%% Первая категория снизу: добавьте invert y (снять — invert y off).
%% Вернуть классический вертикальный вид: rotate 0 (или убрать строку rotate 90).
title Выручка по каналам (поворот 90°)
rotate 90
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 200
grid 50
labels above fontcolor auto
colors s1=#0969da s2=#8250df s3=#2da44e
series Онлайн : 120, 145, 165, 190
series Розница : 85, 95, 110, 130
series Партнёры : 45, 60, 75, 95 color=#f97316`,
  clusteredStacked: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Стопка: серии в одном столбце, а не рядом.
%% stacked / bars stacked / layout stacked
%% Площади — отдельный пример seriesArea, здесь остаются столбцы.
%% Вернуть бары рядом: stacked off или bars grouped
%% Положительные значения растут вверх от нуля, отрицательные — вниз.
title Состав выручки
stacked
gap 8%
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 400
grid 50
labels inside sum fontcolor auto
colors s1=#0969da s2=#8250df s3=#2da44e
series Продукт : 80, 90, 70, 110
series Услуги : 50, 60, 55, 70
series Партнёры : 30, 25, 40, 35`,
  seriesArea: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Площади: stacked area соединяет стопку по центрам категорий.
%% Пропуск (-, пусто, null) обрывает ленту серии и не добавляет высоту.
%% labels sum пишет сумму частей снаружи. Ноль не подписывается.
%% Режим работает вместе с rotate 90, line, break и cagr.
title Состав площадями
stacked area
labels sum fontcolor auto
gap 12%
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 400
series Продукт : 80, 90, 70, 110
series Услуги : 50, 60, 55, 70
series Партнёры : 30, 25, 40, 35`,
  clusteredMono: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Чёрно-белый режим: серии различаются светлотой, а не цветом.
%% Явные colors перекрывают серую шкалу, поэтому здесь их нет.
title Выручка, ч/б
mono
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 200
grid 50
series Онлайн : 120, 145, 165, 190
series Розница : 85, 95, 110, 130
series Партнёры : 45, 60, 75, 95`,
  clusteredMonoInvert: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Инвертированный ч/б: светлые серые столбцы на тёмном холсте.
%% Для тёмной темы и тёмных слайдов. mono off возвращает цвет.
title Выручка, ч/б инверсия
mono invert
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 200
grid 50
series Онлайн : 120, 145, 165, 190
series Розница : 85, 95, 110, 130
series Партнёры : 45, 60, 75, 95`,
  seriesLines: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Линия поверх столбцов: line Подпись : зн1, зн2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot. По умолчанию solid и толщина 1.75.
%% Пропуск категории: пустой слот, «-» или null. Линия соединяет точки по сторонам пропуска.
%% Подпись стоит справа от края зоны графика, на высоте последней заданной точки.
%% ВТОРАЯ ОСЬ: y2 "подпись" min --> max рисует шкалу справа, а axis=y2 у линии,
%% серии или уровня считает её значения по этой шкале (здесь — конверсия в %).
title Факт и ориентиры
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 220
y2 "конверсия, %" 0 --> 40
%% grid y2 5 — сетка второй шкалы. grid y2 off и axis y2 off её прячут.
grid y2 5
grid 20
labels above fontcolor auto
series Факт : 120, 145, 165, 190
line Сплошная : 110, 130, 150, 180 color=#0969da style=solid width=2
line Пунктир : 100, -, 160, 175 color=#8250df style=dash
line Точки : 90, , 155, 170 color=#2da44e style=dot width=1
line Штрих-точка : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5
line Конверсия : 14, 19, 26, 34 axis=y2 color=#d33682 style=solid width=2`,
  seriesCagr: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% cagr без номеров — стрелка от первого бара к последнему.
title Рост выручки
categories 2021, 2022, 2023, 2024
y "млн ₽" 0 --> 220
grid 20
series Выручка : 80, 110, 150, 190
cagr`,
  seriesCagrRanges: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Разные опции cagr на диапазонах баров 1–3, 4–6 и 7–9.
%% Номера баров с единицы. Несколько cagr подряд относятся к серии перед ними.
%% format="0%"        целое, по умолчанию
%% format="0.0%"      один знак; «+» в шаблоне добавляет плюс
%% format="0.00"      доля, без знака процента
%% prefix="CAGR: "    текст перед числом
%% label="цель"       овал как есть, без расчёта (prefix тогда не пишется)
title CAGR по диапазонам
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "млн ₽" 0 --> 220
grid 20
series Онлайн : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="цель"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
  seriesBreak: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Разрыв шкалы: участок 200..700 ВЫРЕЗАН, чтобы мелкие столбцы стали крупнее.
%% Бар, проходящий через разрыв, рисуется кусками с «зигзагом» на линии.
%% Синтаксис — как у waterfall: break <после> --> <до> ["подпись"]
title Выручка с разрывом шкалы
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 1000
grid 100
break 200 --> 700 "разрыв шкалы"
series Онлайн : 120, 180, 860, 240
series Розница : 80, 140, 790, 190`,
  seriesThresholds: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% ГОРИЗОНТАЛЬНЫЕ ЛИНИИ — уровень плана, цель, порог.
%% Это НЕ ломаная по категориям: у линии уровня нет двоеточия.
%%
%%   line <значение> ["подпись"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line Подпись : зн1, зн2, …   — по-прежнему ломаная поверх столбцов
%%
%% Линия рисуется по всей ширине графика, подпись — справа, с вырезом под текст.
title Выручка против плана
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 250
grid 50
line 160 "план"
line 200 "цель" color=#cf222e width=2
line 120 "порог" style=dot width=1
series Факт : 120, 145, 165, 190
series Ориентир : 110, 130, 150, 180`,
  seriesUnnamed: `series
%% Оси: axis y off и axis y2 off прячут шкалу вместе с её сеткой, axis x off — подписи категорий. Следующий grid возвращает линии без подписей.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире.
%% Стопка: stacked — столбцы, stacked area — площади между центрами. labels sum пишет сумму частей снаружи, ноль не подписывается.
%% Цвет подписей: labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет. Внутри фигуры фон — её заливка, снаружи и у суммы — холст.
%% Имя серии и подпись линии можно не писать.
%%   series : зн1, зн2, …     столбцы без строки в легенде
%%   line : зн1, зн2, …       линия без подписи справа
%% color и style задаются как обычно.
title Кварталы без названий
categories Q1, Q2, Q3, Q4
y "млн ₽" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
};

export const MERMAID_EXT_SAMPLES_EN: Record<MermaidExtSampleId, string> = {
  ...HISTOGRAM_SAMPLES_EN,
  waterfall: `waterfall
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
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
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
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
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
%% Multiple series: each group has its own base colour,
%% increases 20% lighter, decreases 25% darker.
%% gap 16% is a share of empty space. gap 8 sets the same space in pixels.
title Plan vs actual
y "M USD" 0 --> 400
grid 100
gap 16%
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
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
%% LABELS AND LINES — the two things people miss most.
%%
%% 1) inside and above choose where the value label goes.
%%    Flags sit at the end of a data row; order does not matter, case neither.
%%    One flag does not draw the other, so inside alone is not copied above:
%%      =90 : Q1 inside           inside only (nothing above the bar)
%%      -25 : Q3 above            above the bar only
%%    Both at once are allowed, and each can carry its own text:
%%      +60 : Q2 inside="60" above="+60 M"
%%    Both positions with the same number:
%%      = : Total inside above
%%    For every bar at once:  labels inside | above | both | none
%%    labels fontcolor auto colors the number against the surface under it: the bar fill inside, the canvas outside. labels fontcolor #1f2328 sets a color. Without fontcolor, inside stays white and outside stays grey.
%%    Text that does not fit inside the bar is moved above it, once.
%%
%% 2) LINES between bars are a DIRECTIVE on its own line (not a flag):
%%      connectors on    enable (on by default)
%%      connectors off   disable
%%    The dashed line runs from the working edge of a bar to the next one:
%%    growth — from the top, decline — from the bottom. Different levels
%%    are joined with a step.
%%
%% 3) Shared text when a position has none of its own:  label="+60 M"
%%    No label at all:                                  no-label
%%
%% 4) Colours: colors total= increase= decrease=
title Labels and lines
y "M USD" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
labels fontcolor auto
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 M"
-25 : Q3 above
= : Total inside above`,
  waterfallNoLines: `waterfall
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
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
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 M"
-25 : Q3 above
= : Total inside above`,
  waterfallThresholds: `waterfall
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
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
%% Axes: axis y off hides the value axis and its grid, axis x off hides column labels. A later grid brings the lines back without tick labels. grid off hides only the grid.
%% Gap: gap 12 is the pixel space between bars and columns, gap 20% is the empty share. There is no second axis and no stack total.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a bar the surface is its fill, outside it is the canvas. Without fontcolor, inside stays white and outside stays grey.
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
  boxplot: `boxplot
%% Box plot: quartiles Q1/Q2/Q3, whiskers, mean diamond, and outliers.
%% Two ways to define a category row:
%%   1) Explicit five-number summary: Category : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) Raw sample observations:      Category : values=20, 28, 35, 42, 50, 62, 145 color=#hex (Tukey 1.5*IQR whiskers)
%% Colour options:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — black-and-white print mode
title Service latency distribution
y "ms" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
API gateway : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
Payments : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
Search : values=12, 22, 28, 34, 38, 45, 52, 68, 148
Analytics : 30, 55, 78, 110, 155 color=#0f766e`,
  treemap: `treemap
%% Tree map: each rectangle area is proportional to its numeric weight.
%% Row syntax: Group / Item : <weight> [color=#hex]
%% labels directive: values | percent | both | none (default is both — value and % share).
%% Colour options: colors s1=#hex s2=#hex ..., color=#hex on a group/item, or mono.
title IT budget breakdown (M USD)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
Infrastructure / Cloud & K8s : 420
Infrastructure / Network & CDN : 180
Infrastructure / Storage : 140
Engineering / Backend & API : 360
Engineering / Web & Mobile : 260
Engineering / QA & Automation : 140
Data & AI / Data Warehouse : 240
Data & AI / ML Models : 160 color=#0f766e`,
  radar: `radar
%% Radar / spider chart: compares multiple series across N >= 3 axes.
%% Directives:
%%   axes Axis 1, Axis 2, ...  spoke labels (at least 3)
%%   scale 0 --> 100           value range along spokes
%%   rings 5                   number of concentric polygon rings
%%   fill 0.22                 polygon fill opacity (0..1 or off)
%%   dots on|off               vertex markers
%%   colors s1=#hex s2=#hex    series palette (or color=#hex per series, or mono)
title Cloud platform comparison
axes Performance, Reliability, Security, Developer UX, Ecosystem, Cost efficiency
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series Platform A : 90, 92, 88, 82, 95, 70
series Platform B : 78, 85, 94, 90, 80, 86
series Platform C : 84, 76, 80, 88, 74, 92 color=#f97316`,
  voronoi: `voronoi
%% Voronoi tessellation: partitions a plane into nearest-site convex cells.
%% Directives:
%%   x "label" min --> max     X axis (default 0 --> 100)
%%   y "label" min --> max     Y axis (default 0 --> 100)
%%   sites on|off              draw site center dots
%%   labels on|off             draw cell labels at polygon centroids
%%   colors s1=#hex s2=#hex    group/cell palette (or color=#hex per site, or mono)
title Logistics hub coverage zones
x "West — East, km" 0 --> 100
y "South — North, km" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
North Hub : x=48, y=82, group=Trunk
South Hub : x=52, y=18, group=Trunk
West Terminal : x=20, y=54, group=Regional
East Terminal : x=82, y=56, group=Regional
Central Depot : x=50, y=50, group=Core
Southwest : x=24, y=22, group=Regional, color=#f97316`,
  clustered: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Series chart: groups multiple series side by side for each category.
%% To rotate the chart by 90 degrees (horizontal bars), add: rotate 90
%% Directives:
%%   categories C1, C2, ...    category labels (alias: x C1, C2, ...)
%%   y "label" min --> max     value axis scale
%%   labels above|inside|none  value labels
%%   colors s1=#hex s2=#hex    series palette (or color=#hex on a series row, or mono)
title Revenue by sales channel
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 200
grid 50
gap 15%
labels above fontcolor auto
colors s1=#0969da s2=#8250df s3=#2da44e
series Online : 120, 145, 165, 190
series Retail : 85, 95, 110, 130
series Partners : 45, 60, 75, 95 color=#f97316`,
  clusteredRotated: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Series chart ROTATED BY 90 DEGREES (rotate 90).
%% The rotate 90 directive (or orientation horizontal) swaps the axes:
%% categories run top-to-bottom on the left, and grouped bars grow left-to-right.
%% Put the first category at the bottom with: invert y (revert with invert y off).
%% Switch back to vertical bars with: rotate 0 (or remove rotate 90).
title Revenue by channel (rotated 90°)
rotate 90
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 200
grid 50
labels above fontcolor auto
colors s1=#0969da s2=#8250df s3=#2da44e
series Online : 120, 145, 165, 190
series Retail : 85, 95, 110, 130
series Partners : 45, 60, 75, 95 color=#f97316`,
  clusteredStacked: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Stacked bars: series share one column instead of sitting side by side.
%% stacked / bars stacked / layout stacked
%% Areas live in the separate seriesArea example. These stay columns.
%% Side by side again: stacked off or bars grouped
%% Positive values grow up from zero, negative values grow down.
title Revenue mix
stacked
gap 8%
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 400
grid 50
labels inside sum fontcolor auto
colors s1=#0969da s2=#8250df s3=#2da44e
series Product : 80, 90, 70, 110
series Services : 50, 60, 55, 70
series Partners : 30, 25, 40, 35`,
  seriesArea: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Areas: stacked area joins the stack through category centers.
%% A skip (-, empty, null) breaks that series band and adds no height.
%% labels sum writes the part total outside the stack. Zero is omitted.
%% The mode stays available with rotate 90, line, break and cagr.
title Composition as areas
stacked area
labels sum fontcolor auto
gap 12%
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 400
series Product : 80, 90, 70, 110
series Services : 50, 60, 55, 70
series Partners : 30, 25, 40, 35`,
  clusteredMono: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Black-and-white: series differ by lightness, not hue.
%% Explicit colors override the grey scale, so this sample leaves them out.
title Revenue, mono
mono
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 200
grid 50
series Online : 120, 145, 165, 190
series Retail : 85, 95, 110, 130
series Partners : 45, 60, 75, 95`,
  clusteredMonoInvert: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Inverted black-and-white: light grey bars on a dark canvas.
%% For dark themes and dark slides. mono off brings colour back.
title Revenue, inverted mono
mono invert
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 200
grid 50
series Online : 120, 145, 165, 190
series Retail : 85, 95, 110, 130
series Partners : 45, 60, 75, 95`,
  seriesLines: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% A line over the bars: line Label : v1, v2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot. Defaults are solid and width 1.75.
%% Skip a category with an empty slot, "-", or null. The line joins the points on either side.
%% The label sits to the right of the plot, at the height of the last given point.
%% SECOND AXIS: y2 "label" min --> max draws a scale on the right, and axis=y2 on a
%% line, series, or level reads its values against that scale (here — conversion %).
title Actuals and guides
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 220
y2 "conversion, %" 0 --> 40
%% grid y2 5 draws the second scale grid. grid y2 off and axis y2 off hide it.
grid y2 5
grid 20
labels above fontcolor auto
series Actual : 120, 145, 165, 190
line Solid : 110, 130, 150, 180 color=#0969da style=solid width=2
line Dashed : 100, -, 160, 175 color=#8250df style=dash
line Dotted : 90, , 155, 170 color=#2da44e style=dot width=1
line Dash-dot : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5
line Conversion : 14, 19, 26, 34 axis=y2 color=#d33682 style=solid width=2`,
  seriesCagr: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Plain cagr draws an arrow from the first bar to the last.
title Revenue growth
categories 2021, 2022, 2023, 2024
y "M USD" 0 --> 220
grid 20
series Revenue : 80, 110, 150, 190
cagr`,
  seriesCagrRanges: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Different cagr options on bar ranges 1–3, 4–6 and 7–9.
%% Bar numbers start at 1. Consecutive cagr lines belong to the series just above them.
%% format="0%"        integer, the default
%% format="0.0%"      one decimal; "+" in the pattern adds a plus sign
%% format="0.00"      a ratio, without a percent sign
%% prefix="CAGR: "    text before the number
%% label="target"     oval text as-is, no calculation (prefix is then ignored)
title CAGR by range
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "M USD" 0 --> 220
grid 20
series Online : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="target"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
  seriesBreak: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% Axis break: the 200..700 span is CUT so small bars become bigger.
%% A bar crossing the break is drawn in pieces with a zigzag on the line.
%% Same syntax as waterfall: break <after> --> <before> ["label"]
title Revenue with an axis break
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 1000
grid 100
break 200 --> 700 "axis break"
series Online : 120, 180, 860, 240
series Retail : 80, 140, 790, 190`,
  seriesThresholds: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% HORIZONTAL LINES — plan, target, threshold.
%% This is NOT a line across categories: a level line has no colon.
%%
%%   line <value> ["label"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line Label : v1, v2, …   — still a polyline over the bars
%%
%% The line spans the plot; the label sits on the right, with a gap behind the text.
title Revenue against plan
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 250
grid 50
line 160 "plan"
line 200 "target" color=#cf222e width=2
line 120 "threshold" style=dot width=1
series Actual : 120, 145, 165, 190
series Guide : 110, 130, 150, 180`,
  seriesUnnamed: `series
%% Axes: axis y off and axis y2 off hide that scale and its grid, axis x off hides category labels. A later grid brings the lines back without tick labels.
%% Gap: gap 0 is no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide.
%% Stack: stacked draws columns, stacked area draws bands between category centers. labels sum writes the signed part total outside; zero is omitted.
%% Label color: labels fontcolor auto picks a contrasting color for the surface under the text. labels fontcolor #1f2328 sets a color. Inside a shape the surface is its fill, outside and for the sum it is the canvas.
%% The series name and the line label can be left out.
%%   series : v1, v2, …     bars with no legend row
%%   line : v1, v2, …       a line with no caption on the right
%% color and style still apply.
title Quarters with no names
categories Q1, Q2, Q3, Q4
y "M USD" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
};
