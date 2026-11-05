import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "Вставить таблицу из буфера",
  "editor.pasteTableHistory": "Вставка таблицы",
  "tablePaste.modalTitle": "Не удалось вставить таблицу",
  "tablePaste.reasonLabel": "В чём ошибка",
  "tablePaste.expectedLabel": "Какая таблица ожидается ({type})",
  "tablePaste.columnsLabel": "Колонки:",
  "tablePaste.rulesLabel": "Правила преобразования:",
  "tablePaste.sampleLabel": "Пример таблицы для копирования (Excel / Google Таблицы / TSV):",
  "tablePaste.error.emptyClipboard":
    "Буфер обмена пуст. Скопируйте диапазон ячеек из Excel, Google Таблиц или текстовую таблицу с разделителем табуляции (TSV) или «;».",
  "tablePaste.error.clipboardReadFailed":
    "Не удалось прочитать буфер обмена. Разрешите доступ к буферу в браузере и попробуйте снова.",
  "tablePaste.error.notATable":
    "В буфере обмена не распознана таблица (нужно минимум 2 колонки, разделённые табуляцией, «;» или «|»).",
  "tablePaste.error.tooManyColumns":
    "Слишком много колонок: в буфере {actual}, а для этой диаграммы ожидается ровно {expected}.",
  "tablePaste.error.tooFewColumns":
    "Недостаточно колонок: в буфере {actual}, а для этой диаграммы ожидается {expected}.",
  "tablePaste.error.tooFewColumnsMin":
    "Недостаточно колонок: в буфере {actual}, а требуется минимум {min}.",
  "tablePaste.error.tooFewRowsMin":
    "Недостаточно строк: в буфере {actual}, а требуется минимум {min} (шапка и данные).",
  "tablePaste.error.expectedColumnRange":
    "Неверное число колонок: в буфере {actual}, а ожидается от {min} до {max} колонок.",
  "tablePaste.error.waterfallColumns":
    "Ожидается 2 колонки: одна с текстовыми подписями, другая с числами (или пустыми ячейками для итогов «=»).",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "В первой строке данных (строка {row}) должно быть начальное числовое значение (старт «=число»), а не пустая ячейка.",
  "tablePaste.error.noNumericColumn":
    "Ни одна из колонок не содержит числовых значений.",
  "tablePaste.error.invalidNumberAtRow":
    "Строка {row}: значение «{value}» не является корректным числом.",
  "tablePaste.error.negativeNotAllowedAtRow":
    "Строка {row}: отрицательное значение «{value}» недопустимо для круговой диаграммы.",
  "tablePaste.error.noDataRows":
    "В скопированной таблице нет строк с данными.",
  "tablePaste.type.waterfall": "Водопад (Waterfall)",
  "tablePaste.type.pie": "Круговая диаграмма (Pie)",
  "tablePaste.type.heatmap": "Тепловая карта (Heatmap)",
  "tablePaste.type.bubble": "Пузырьковая диаграмма (Bubble)",
  "tablePaste.type.ev": "Освоенный объём (Earned Value)",
  "tablePaste.type.xychart": "XY-график (Bar / Line)",
  "tablePaste.type.quadrant": "Квадрант (Quadrant Chart)",
  "tablePaste.type.sankey": "Диаграмма Санки (Sankey)",
  "tablePaste.type.orgchart": "Оргструктура (Orgchart)",
  "tablePaste.type.gantt": "Диаграмма Ганта (Gantt)",
  "tablePaste.type.timeline": "Временная шкала (Timeline)",
  "tablePaste.type.journey": "Путь пользователя (User Journey)",
  "tablePaste.type.packet": "Заголовок пакета (Packet)",
  "tablePaste.type.wbs": "Иерархия работ (WBS)",
  "tablePaste.type.mindmap": "Интеллект-карта (Mindmap)",
  "tablePaste.type.nwdiag": "Сетевая диаграмма (Nwdiag)",
  "tablePaste.type.wireframe": "Таблица в каркасе (WireMark Table)",
  "tablePaste.expected.waterfall.columns":
    "2 колонки в любом порядке: «Подпись» и «Значение» (или «Значение» и «Подпись»).",
  "tablePaste.expected.waterfall.rules":
    "Первое число становится стартом (=N), положительные числа — приращением (+N), отрицательные — снижением (-N), пустая ячейка (или «=») — промежуточным/финальным итогом (= : Подпись).",
  "tablePaste.expected.waterfall.headers": "Подпись|Значение",
  "tablePaste.expected.pie.columns":
    "2 колонки в любом порядке: «Категория» и «Неотрицательное число».",
  "tablePaste.expected.pie.rules":
    "Каждая строка превращается в долю круговой диаграммы \"Категория\" : Число.",
  "tablePaste.expected.pie.headers": "Категория|Доля",
  "tablePaste.expected.heatmap.columns":
    "Матрица минимум 2×2: первая строка — подписи колонок X, первый столбец — подписи строк Y, внутри — числа (или пустые ячейки).",
  "tablePaste.expected.heatmap.rules":
    "Строки x и y вставляются перед блоком scale. Если scale нет, добавляется шкала от минимума до максимума значений, от синего к красному. Пустые ячейки остаются пустыми пропусками.",
  "tablePaste.expected.heatmap.headers": "Период|Пн|Вт|Ср",
  "tablePaste.expected.bubble.columns":
    "4 или 5 колонок: «Подпись», «X (число)», «Y (число)», «Размер (число)», [«Группа (необязательно)»].",
  "tablePaste.expected.bubble.rules":
    "Каждая строка превращается в точку: Подпись : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "Продукт|X|Y|Размер|Группа",
  "tablePaste.expected.ev.columns":
    "4 колонки: «Период (days)», «PV (план)», «EV (освоено)», «AC (факт)» (либо 4 строки days, pv, ev, ac).",
  "tablePaste.expected.ev.rules":
    "Формирует ряды days, pv, ev и ac для графика освоенного объёма.",
  "tablePaste.expected.ev.headers": "Период|PV|EV|AC",
  "tablePaste.expected.xychart.columns":
    "От 1 колонки. Одна колонка — числа для bar [Val 1, ..., Val n]. Две — «Категория X» и «Значение bar». Три и больше — «Категория X» и отдельный bar на каждую следующую колонку.",
  "tablePaste.expected.xychart.rules":
    "Одна колонка добавляет строку bar [значения]. Две и больше колонок заменяют или добавляют x-axis и по одному bar [...] на каждую числовую колонку. Если оси Y ещё нет, добавляется y-axis \"\" min --> max.",
  "tablePaste.expected.xychart.headers": "Месяц|План|Факт|Прогноз",
  "tablePaste.expected.quadrant.columns":
    "3 колонки: «Название точки», «X (0..1 или 0..100%)», «Y (0..1 или 0..100%)».",
  "tablePaste.expected.quadrant.rules":
    "Координаты больше 1 автоматически нормализуются из процентов (0..100) в диапазон [0..1].",
  "tablePaste.expected.quadrant.headers": "Элемент|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 колонки: «Источник», «Приёмник», «Величина потока (число)».",
  "tablePaste.expected.sankey.rules":
    "Каждая строка превращается в поток Источник,Приёмник,Число.",
  "tablePaste.expected.sankey.headers": "Источник|Приёмник|Поток",
  "tablePaste.expected.orgchart.columns":
    "2 или 3 колонки: «Руководитель», «Подчинённый», [«Тип связи (dotted / пунктир) или Должность»].",
  "tablePaste.expected.orgchart.rules":
    "Формирует узлы оргструктуры и связи -> (сплошная) или -.-> (пунктир, если в 3-й колонке указано dotted / пунктир).",
  "tablePaste.expected.orgchart.headers": "Руководитель|Подчинённый|Связь",
  "tablePaste.expected.gantt.columns":
    "От 2 до 4 колонок: «Задача», «Дата начала или длительность», [«Длительность (5d)»], [«Секция»].",
  "tablePaste.expected.gantt.rules":
    "Формирует список задач диаграммы Ганта (с группировкой по секциям в Mermaid).",
  "tablePaste.expected.gantt.headers": "Задача|Начало|Длительность|Секция",
  "tablePaste.expected.timeline.columns":
    "2 или 3 колонки: «Период / Дата», «Событие», [«Секция (необязательно)»].",
  "tablePaste.expected.timeline.rules":
    "Каждая строка превращается в событие хронологии «Период : Событие».",
  "tablePaste.expected.timeline.headers": "Период|Событие|Секция",
  "tablePaste.expected.journey.columns":
    "От 2 до 4 колонок: «Шаг», «Оценка (1–5)», [«Участники»], [«Секция»].",
  "tablePaste.expected.journey.rules":
    "Формирует шаги пользовательского пути «Шаг: Оценка: Участники».",
  "tablePaste.expected.journey.headers": "Шаг|Оценка|Участники|Секция",
  "tablePaste.expected.packet.columns":
    "2 колонки в любом порядке: «Диапазон бит (0-15) или длина в битах (16)» и «Название поля».",
  "tablePaste.expected.packet.rules":
    "Формирует поля заголовка пакета «0-15: \"Поле\"» (если указаны длины бит, диапазоны рассчитываются автоматически).",
  "tablePaste.expected.packet.headers": "Биты|Поле",
  "tablePaste.expected.wbs.columns":
    "2 и более колонок по уровням иерархии: «Уровень 1 (Корень)», «Уровень 2», «Уровень 3» и т.д.",
  "tablePaste.expected.wbs.rules":
    "Строит дерево иерархии работ (*, **, ***), автоматически группируя одинаковые родительские ячейки.",
  "tablePaste.expected.wbs.headers": "Уровень 1|Уровень 2|Уровень 3",
  "tablePaste.expected.mindmap.columns":
    "2 и более колонок по уровням дерева: «Корень», «Ветка 1-го уровня», «Ветка 2-го уровня» и т.д.",
  "tablePaste.expected.mindmap.rules":
    "Строит дерево интеллект-карты, объединяя одинаковых родителей. Узлы встают на пустую строку у курсора, заменяют выделение или заменяют все узлы карты. Legend, title, header, footer, caption, style и комментарии сохраняются.",
  "tablePaste.expected.mindmap.headers": "Корень|Ветка|Подветка",
  "tablePaste.expected.nwdiag.columns":
    "2 или 3 колонки: «Узел», «IP-адрес», [«Сеть (необязательно)»].",
  "tablePaste.expected.nwdiag.rules":
    "Группирует узлы по сетям в блоки network { node [address = \"...\"] }.",
  "tablePaste.expected.nwdiag.headers": "Узел|IP-адрес|Сеть",
  "tablePaste.expected.wireframe.columns":
    "Любая таблица от 2 колонок (первая строка — заголовки колонок, остальные — строки таблицы).",
  "tablePaste.expected.wireframe.rules":
    "Генерирует компонент Table с TableHead и TableBody (числовые колонки автоматически выравниваются вправо align=right).",
  "tablePaste.expected.wireframe.headers": "Название|Автор|Статус|Просмотры",
} as const satisfies LocaleMessages;
