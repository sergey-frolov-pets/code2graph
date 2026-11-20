# code2graph — детальная структура проекта

> Сгенерировано 2026-11-16 для экономии токенов на последующих запросах.
> Всего ~217k строк TypeScript/TSX. Тут описаны только значимые для работы участки.

## Общая архитектура

```
code2graph/
├── apps/billing-admin/           # React/Vite админка биллинга (не касается задачи)
├── deploy/                       # systemd-юниты, скрипты деплоя
├── docs/                         # Документация по синтаксису, биллингу, деплою
├── packages/
│   ├── mcp/                      # MCP-сервер: рендер диаграмм в PNG/SVG для AI
│   └── shared/                   # Общие утилиты LLM-стриминга, страниц, диаграмм
├── public/                       # Статика, plantuml-lib, landing-assets
├── sandbox/                      # Фикстуры и golden-тесты
├── scripts/                      # Скрипты сборки/деплоя/ext-префлайта
├── server/                       # Бэкенд: auth, billing, миграции, routes
└── src/                          # Основное фронтовое приложение Vue/React (Vite)
    ├── app/                      # Точки входа, роутинг
    ├── components/               # UI-компоненты
    ├── constants/                # Сэмплы, сниппеты, настройки
    ├── core/                     # safe-storage, мелкие утилиты
    ├── formats/                  # Обработчики форматов (mermaid/d2/plantuml/...)
    ├── languages/                # Подсветка, автодополнение, примеры
    ├── pages/                    # Страницы приложения
    ├── schemas/                  # Zod-like схемы для LLM-выхода
    └── services/                 # Ядро бизнес-логики
```

## Скрипты npm (package.json)

- `dev` / `build` — Vite
- `test:ext` — `vitest run src/services/mermaid/ext`
- `golden:update` / `golden:check` — golden-тесты
- `ext:preflight`, `ext:refresh`, `ext:refresh:verify` — служебные для Mermaid Ext

---

## Сервис Mermaid Ext (где живёт задача)

Путь: `src/services/mermaid/ext/`

Это собственные типы диаграмм поверх Mermaid (не upstream). Работает только при `__MERMAID_EXT__ = true`.

### Файлы

| Файл | Строк | Роль |
|------|------:|------|
| `types.ts` | 65 | `ExtDiagramType`, `ExtEngine<T>`, `ExtParseResult<T>`, `ExtRenderOptions` |
| `common.ts` | 630 | Общий рендер: палитра, цвета, `measureText`, `splitLabelLines`, `drawLabelLines`, `createSvg`, `arrowMarker` |
| `registry.ts` | — | Регистрация всех движков |
| `chart-aspect.ts` | — | `growPlotToAspect`, директива `ratio` |
| `placeholder.ts` | — | Плейсхолдеры для async-рендера |
| `engines/*.ts` | — | Каждый движок = parse + render |
| `__tests__/*.test.ts` | — | Vitest-тесты |

### Движки Mermaid Ext

- `waterfall/` — parser + renderer + scale + types
- `histogram/` — parser + renderer + stats + types
- `bubble`, `heatmap`, `boxplot`, `treemap`, `radar`, `voronoi`, `series`, `gauge`, `dashboard`, `infographic`, `ev`
- **powermap.ts** (2401 строка) — stakeholder map
- **orgchart.ts** (1117 строк) — организационная иерархия
- `avatar.ts` — аватарки/силуэты

### Рендер-движок Mermaid Ext — обязательные функции

```ts
export interface ExtEngine<T> {
  type: ExtDiagramType;
  aliases: string[];
  parse(source: string): ExtParseResult<T>;
  render(model: T, options: ExtRenderOptions): string;
}
```

---

## Целевые движки: powermap + orgchart

### `src/services/mermaid/ext/engines/powermap.ts`

Реализует диаграммы типа `powermap` / `power-map` / `power`.

#### Модель

```ts
interface PowerModel {
  title?: string;
  company?: string;
  legend: boolean;
  comms: boolean;             // таблица коммуникаций
  legendLang?: string;
  avatarSize: number;
  mono?: boolean;
  monoInvert?: boolean;
  ratio?: ChartAspect;
  people: PowerPerson[];
  reports: PowerReportEdge[];   // solid / dotted подчинение
  influences: PowerInfluenceEdge[];
  links: PowerLinkStyle[];
  root: string | null;
  virtualRoot: boolean;
}

interface PowerPerson {
  id: string;
  name: string;
  title: string;
  photo?: string;
  gender?: AvatarGender;
  hideAvatar?: boolean;
  role?: ScoreSwatch;
  influence?: ScoreSwatch;
  action?: ScoreSwatch;
  attitude?: ScoreSwatch;
  counterpart: string;
}

interface PowerInfluenceEdge {
  from: string;
  to: string;
  name: string;     // имя связи, ссылается на PowerLinkStyle
  label?: string;   // <<== ЗАДАЧА: здесь добавить многострочность
  both?: boolean;
}

interface PowerLinkStyle {
  name: string;
  color: string;
  style: LinkStroke;
  label: string;    // <<== и здесь (легенда + коммуникации)
  width: number;
}
```

#### Парсер (ключевые функции)

- `parsePowermap(source)` — основной парсер
- `unquote(raw)` / `unquoteLabel(raw)` — уже поддерживает `\n`, настоящий перевод строки, `<br>`
- `parseRelation(raw)` — разбор рёбер
- `splitTrailingLabel(raw)` — `label="..."` в хвосте стрелки
- `parseLinkLine(raw)` — `link name color=#hex label=...`

#### Рендер (ключевые функции)

- `renderPowermap(model, options)` — основной рендер
- `measureCard(person)` — высота/ширина карточки человека
- `measureLegend()` — легенда связей
- `measureComms()` — таблица коммуникаций
- `routeInfluences(...)` — разводка стрелок влияния, избегание накладок
- `drawReportingElbows()` — рёбра подчинения
- `drawCard()` — рисует карточку
- `drawLegend()` — рисует легенду связей
- `drawComms()` — таблица коммуникаций

#### Константы лейблов рёбер

```ts
const EDGE_LABEL_FONT = 10;
const EDGE_LABEL_BAND = 14;
```

Подпись рисуется в `renderPowermap`:

```ts
routed.routes.forEach((route) => {
  if (!route.label) return;
  const plateWidth = measureText(route.label, EDGE_LABEL_FONT) + 10;
  const plateX = route.labelX - plateWidth / 2;
  const plateY = route.labelY - EDGE_LABEL_BAND + 2;
  svg.rect(plateX, plateY, plateWidth, EDGE_LABEL_BAND, { fill: palette.bg, stroke: "none" });
  svg.text(route.labelX, route.labelY, route.label, { "font-size": EDGE_LABEL_FONT, fill: route.color });
});
```

**Проблема:** `measureText(route.label, EDGE_LABEL_FONT)` не учитывает многострочность. `svg.text` рисует всё одной строкой.

#### Влияние на лейблы в таблице коммуникаций

```ts
function linkLines(model, personId): string[] {
  ...
  const detail = edge.label?.trim() ? `${caption} — ${edge.label.trim()}` : caption;
  captions.push(`${arrow} ${personName(model, otherId)}: ${detail}`);
}
```

Здесь многострочные label будут встраиваться как есть, но `measureComms`/`drawComms` уже поддерживают многострочные ячейки (смотри `rowHeights`). Однако label внутри строки `` — `\n` внутри строки не разобьёт ячейку на несколько строк. Нужно будет либо экранировать, либо разбивать.

### `src/services/mermaid/ext/engines/orgchart.ts`

Реализует диаграммы типа `orgchart` / `org`.

#### Модель

```ts
interface OrgModel {
  title?: string;
  mono?: boolean;
  monoInvert?: boolean;
  nodes: OrgNode[];
  edges: OrgEdge[];
  root: string | null;
  virtualRoot: boolean;
  ratio?: ChartAspect;
  avatarSize: number;
}

interface OrgNode {
  id: string;
  label: string;         // <<== ЗАДАЧА: label уже многострочный (через \n, <br>, |)
  fill?: string;
  border?: string;
  borderStyle?: OrgBorderStyle;
  borderWidth?: number;
  photo?: string;
  gender?: AvatarGender;
  hideAvatar?: boolean;
}

interface OrgEdge {
  from: string;
  to: string;
  style: OrgEdgeStyle;  // "solid" | "dotted"
}
```

**Важно:** в orgchart у рёбер нет label — только стиль. Поэтому многострочные labels на рёбрах для orgchart не актуальны (только для powermap).

#### Парсер

- `parseOrgchart(source)` — основной парсер
- `unquoteLabel(raw)` — уже поддерживает `\n`, `<br>`, `|` как разделители строк
- `parseNodeLine(raw)` — разбор строки узла
- `parseNodeAttrs(tail)` — разбор атрибутов узла (color, border, style, width, photo, gender, avatar)
- `parseEdgeLine(raw)` — разбор ребра `A -> B` / `A -.-> B`

#### Раскладка

- `layoutOrgTree(nodes, edges, ...)` — универсальная раскладка дерева (используется и powermap)
- `computeDepths(...)` — BFS для глубины узлов
- `measureNode(node, framePx)` — размеры блока

#### Рендер

- `renderOrgchart(model, options)` — основной рендер
- `drawReportingElbows(svg, placed, edges, offsetX, offsetY, stroke, markerRef)` — ломаные подчинения
- `reportingElbowRoutes(...)` — расчёт маршрутов подчинения (используется и powermap)
- `separateMergedArrivals(...)`, `assignElbowLanes(...)` — разъезд стрелок

### Общий модуль `common.ts`

Ключевые функции для задачи:

- `measureText(text, fontSize)` — измеряет ширину **одной строки** (без учёта `\n`)
- `hasLabelBreak(label)` — проверяет наличие `\n`
- `splitLabelLines(label)` — разбивает по `\n`, возвращает массив строк
- `drawLabelLines(svg, x, y, label, fontSize, attrs, placement)` — рисует многострочную подпись
- `measureLabelWidth(label, fontSize)` — ширина (макс. из строк)
- `labelLineStep(fontSize)` — вертикальный шаг строк
- `truncate(text, maxWidth, fontSize)` — обрезка с `…`
- `truncateLabel(label, maxWidth, fontSize)` — обрезка многострочной подписи

---

## Тесты

### `__tests__/label-breaks.test.ts` (120 строк)

Тестирует `\n`-переносы для: waterfall, bubble, heatmap, ev, boxplot, treemap, radar, voronoi, clustered. Проверяет, что SVG содержит все строки и высота холста увеличилась.

### `__tests__/powermap.test.ts` (691 строка)

Тесты парсера и рендера powermap.

### `__tests__/orgchart.test.ts` (645 строк)

Тесты парсера и рендера orgchart.

---

## Задача: многострочные label у связей powermap

### Что уже есть

1. **Парсер:** `unquoteLabel()` уже разбивает по `\n`, `<br>`, `|` на строки.
2. **Парсер:** `splitTrailingLabel()` извлекает `label="..."` из хвоста стрелки.
3. **Парсер:** `parseLinkLine()` парсит `label=` для объявления стиля связи.
4. **Рендер:** `routeInfluences()` передаёт `label` в `RoutedInfluence`.
5. **Рендер:** `placeEdgeLabel()` находит позицию для подписи.
6. **Рендер:** `renderPowermap()` рисует подпись одной строкой через `svg.text()`.

### Что нужно сделать

1. **Разбор label в `parseRelation()`:** применить `unquoteLabel()` к `label` (сейчас только `unquote().trim()`).
2. **Рендер `renderPowermap()`:** заменить `svg.text` на `drawLabelLines` из `common.ts`.
3. **Измерение ширины плашки:** заменить `measureText` на `measureLabelWidth`.
4. **Высота плашки:** вместо фиксированной `EDGE_LABEL_BAND` — `labelLineCount * labelLineStep + padding`.
5. **`placeEdgeLabel()`:** учитывать многострочность при резервировании места (`labelReserve`).
6. **Разводка стрелок `separateInfluenceTracks()`:** учитывать увеличенную высоту подписи.
7. **Легенда связей:** `linkLabel` уже может быть многострочным — проверить, не ломается ли.
8. **Таблица коммуникаций:** `linkLines` встраивает label в строку — для многострочных нужно либо разбить, либо экранировать.
9. **`label-breaks.test.ts`:** добавить тест для powermap (и orgchart, если актуально).

### Что НЕ ломать

- Обратную совместимость: однострочные label должны работать как раньше.
- Синтаксис: `\n` и `<br>` уже поддерживаются парсером.
- Существующие тесты должны проходить.

---

## План реализации

### Шаг 1: Парсер — `unquoteLabel` для edge label

В `parseRelation()` и `parseLinkLine()`: применить `unquoteLabel()` к label.

### Шаг 2: Рендер — многострочная отрисовка

В `renderPowermap()`: заменить блок отрисовки label на `drawLabelLines`.

### Шаг 3: Измерение — `measureLabelWidth`

В `placeEdgeLabel()`: использовать `measureLabelWidth` вместо `measureText`.

### Шаг 4: Высота резерва — `labelReserve`

Функция `labelReserve()` в `routeInfluences()`: учитывать количество строк.

### Шаг 5: Легенда и коммуникации

Проверить `measureLegend()` / `drawLegend()` и `measureComms()` / `drawComms()`.

### Шаг 6: Тесты

Добавить тесты в `powermap.test.ts` и `label-breaks.test.ts`.