# План: конвертер диаграмм «всё → всё» (с потерями)

> Обновлено: 2026-08-08  
> Контекст: Code2Graph — форматы `plantuml`, `mermaid`, `graphml`  
> Принцип: **semantic из исходника + visual из SVG + metadata при экспорте**

---

## 1. Цель и границы

### Цель

Пользователь может конвертировать диаграмму между **PlantUML**, **Mermaid** и **GraphML** с:

- явным **дисклеймером потерь** до применения;
- **превью** результата (текст + SVG);
- режимом **combo** (исходник + текущий SVG превью);
- **undo** после конвертации.

### Не цель v1

- Без потерь для sequence / activity / gantt / C4
- Редактирование GraphML как полноценного XML-редактора
- Конвертация произвольного чужого SVG без metadata
- Автоконвертация при смене формата в редакторе без подтверждения

### Поддерживаемые типы диаграмм (kind)

| kind | PlantUML | Mermaid | GraphML |
|------|----------|---------|---------|
| `graph` / flowchart | component `[A]` | `flowchart` | native |
| `class` | `class` | `classDiagram` | degraded |
| `state` | state | `stateDiagram-v2` | degraded |
| `er` | — | `erDiagram` | degraded |
| `sequence` | sequence | `sequenceDiagram` | graph-only |
| `activity` | activity | flowchart fallback | graph-only |
| `c4_context` | C4_Context | — | graph-only |
| `c4_container` | C4_Container | — | graph-only |
| `gantt` | `@startgantt` | `gantt` | **blocked** |

---

## 2. Архитектура

### 2.1 Слои данных

```
┌──────────────────────────────────────────────────────────────┐
│                        ConversionPipeline                       │
├─────────────┬─────────────────────┬──────────────────────────┤
│  Semantic   │      Visual         │      Provenance            │
│  (source)   │  (SVG + metadata)   │  (warnings, confidence)    │
├─────────────┼─────────────────────┼──────────────────────────┤
│ parse PUML  │ extractVisualHints  │ ConversionReport           │
│ parse MMD   │ readSvgMetadata     │ lossIds[]                  │
│ parse GML   │ matchNodesByLabel   │ confidence per node/edge   │
└─────────────┴─────────────────────┴──────────────────────────┘
                              │
                              ▼
                      DiagramIR (merged)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         emitPlantUml   emitMermaid    emitGraphml
```

### 2.2 DiagramIR (контракт)

**Файл:** `src/services/conversion/diagram-ir.ts`

```ts
type DiagramKind =
  | "graph"
  | "class"
  | "state"
  | "er"
  | "sequence"
  | "activity"
  | "c4_context"
  | "c4_container"
  | "gantt"
  | "unknown";

type DiagramDirection = "TB" | "LR" | "BT" | "RL";

interface DiagramNode {
  id: string;
  label: string;
  kind?: "default" | "start" | "end" | "decision" | "class" | "actor" | "system";
  groupId?: string;
  semantic?: Record<string, unknown>;
  visual?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
    shape?: "rect" | "round" | "diamond" | "ellipse";
  };
  matchConfidence: number;
}

interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: "arrow" | "dashed" | "inherit" | "message";
  semantic?: Record<string, unknown>;
  matchConfidence: number;
}

interface DiagramGroup {
  id: string;
  label?: string;
  parentId?: string;
}

interface DiagramIR {
  version: 1;
  kind: DiagramKind;
  direction?: DiagramDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  metadata?: {
    sourceFormat?: "plantuml" | "mermaid" | "graphml";
    convertedAt?: string;
    conversionMode?: "source" | "visual" | "combo" | "metadata";
  };
}
```

### 2.3 VisualHints

**Файл:** `src/services/conversion/visual/svg-extractor.ts`

```ts
interface VisualHints {
  nodes: Array<{
    domId?: string;
    label: string;
    bbox: { x: number; y: number; width: number; height: number };
    fill?: string;
    stroke?: string;
    shape?: "rect" | "round" | "diamond" | "ellipse";
  }>;
  edges: Array<{
    sourceLabel?: string;
    targetLabel?: string;
    label?: string;
    pathPoints?: Array<{ x: number; y: number }>;
  }>;
  source: "mermaid-dom" | "plantuml-geometry" | "metadata" | "graphml-dom";
}
```

### 2.4 Merge

**Файл:** `src/services/conversion/merge/merge-diagram-ir.ts`

Порядок приоритетов:

1. **Структура графа** — semantic IR (source/metadata)
2. **Id узлов** — semantic; visual только для enrich
3. **Label** — semantic; visual если semantic пустой
4. **x/y/fill/shape** — visual если `matchConfidence >= 0.5`
5. **Конфликт** — semantic wins + warning `loss.nodeVisualMismatch`

Сопоставление visual ↔ semantic:

| Шаг | Метод |
|-----|--------|
| 1 | Mermaid DOM id (`flowchart-A-0` → `A`) |
| 2 | Exact label match (normalized) |
| 3 | Fuzzy label (Levenshtein ≤ 2) |
| 4 | Topology (edge endpoints by nearest bbox) |

### 2.5 Metadata в SVG (экспорт Code2Graph)

**Файл:** `src/services/conversion/metadata/svg-metadata.ts`

При `exportSvg` встраивать:

```xml
<metadata id="code2graph-ir" data-version="1" data-encoding="gzip-base64">
  ...
</metadata>
```

Содержимое: gzip(JSON DiagramIR) из последнего успешного semantic parse + merge.

При импорте SVG: если metadata есть → **режим metadata** (высший приоритет visual).

---

## 3. Матрица конвертаций и потери

Уровни качества: **A** (мало потерь) · **B** (упрощение) · **C** (только граф) · **D** (заблокировано)

### 3.1 Graph / flowchart / component

| From → To | Уровень | Сохраняется | Теряется (loss ids) |
|-----------|---------|-------------|---------------------|
| GML → PUML | A | узлы, рёбра, labels | `loss.layout`, `loss.styles` |
| GML → MMD | A | flowchart TD/LR | `loss.subgraphs`, `loss.nodeShapes` |
| PUML comp → GML | A | topology | `loss.packages`, `loss.stereotype` |
| PUML comp → MMD | B | nodes, edges | `loss.interface`, `loss.notes` |
| MMD flow → GML | A | nodes, edges | `loss.subgraphs`, `loss.classDef` |
| MMD flow → PUML | B | `[node]`, `-->` | `loss.conditions`, `loss.subgraphs` |

**Combo bonus:** `x`, `y`, `fill`, `shape` из SVG → GraphML keys.

### 3.2 Class

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| PUML → MMD | B | class names, простые связи | `loss.classMembers`, `loss.inheritance` |
| MMD → PUML | B | class + relations | `loss.members`, `loss.cardinality` |
| * → GML | C | class as node | `loss.classMembers`, `loss.relationTypes` |

### 3.3 State

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| PUML ↔ MMD | B | states, transitions | `loss.initialFinal`, `loss.guards`, `loss.composite` |
| * → GML | C | nodes + edges | `loss.stateSemantics` |

### 3.4 ER

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| MMD er → GML | B | entities, relations | `loss.attributes`, `loss.cardinality` |
| GML → MMD er | C | entity boxes | `loss.attributes`, `loss.keys` |
| PUML | D | — | — |

### 3.5 Sequence

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| PUML ↔ MMD | B | participants, simple messages | `loss.messageOrder`, `loss.blocks`, `loss.activate` |
| * → GML | C | participants as nodes | `loss.temporalOrder`, `loss.sequenceSemantics` |
| GML → sequence | D | — | — |

### 3.6 Activity

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| PUML → MMD flow | C | шаги цепочкой | `loss.swimlanes`, `loss.branches` |
| * → GML | C | steps as nodes | `loss.swimlanes`, `loss.controlFlow` |
| GML → activity | D | — | — |

### 3.7 C4

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| C4 → GML | C | Person/System/Container → node | `loss.c4Types`, `loss.boundaries`, `loss.tech` |
| GML → C4 | C | generic System/Rel | `loss.c4Semantics` |
| C4 ↔ MMD | C | flowchart fallback | `loss.c4Semantics` |

### 3.8 Gantt

| From → To | Уровень | Сохраняется | Теряется |
|-----------|---------|-------------|----------|
| PUML ↔ MMD | B | task names, `after` deps | `loss.dates`, `loss.sections`, `loss.calendar` |
| * → GML | D | blocked | `loss.ganttNotGraph` |

### 3.9 SVG-only (без исходника)

| Тип (detected) | → GML | → PUML | → MMD |
|----------------|-------|--------|-------|
| Mermaid flow SVG | B | C | C |
| PlantUML graph SVG | C | C | C |
| С metadata | A | B | B |
| Sequence/activity SVG | D | D | D |

---

## 4. Каталог loss ids (i18n)

**Файлы:** `src/locales/{ru,en}/conversion.ts`

| loss id | Описание |
|---------|----------|
| `loss.layout` | Автоматическая раскладка вместо координат |
| `loss.styles` | Цвета, classDef, skinparam |
| `loss.nodeShapes` | Формы узлов (ромб, стадия, круг) |
| `loss.subgraphs` | Подграфы / package / boundary |
| `loss.classMembers` | Поля и методы классов |
| `loss.inheritance` | Наследование / implements |
| `loss.relationTypes` | Типы связей (агрегация, composition) |
| `loss.cardinality` | Мощность связей |
| `loss.initialFinal` | Начальное/конечное состояние [*] |
| `loss.guards` | Условия на переходах |
| `loss.swimlanes` | Дорожки activity |
| `loss.branches` | if/while/fork/parallel |
| `loss.messageOrder` | Порядок сообщений sequence |
| `loss.blocks` | alt/opt/loop/par |
| `loss.c4Types` | Типы элементов C4 |
| `loss.c4Semantics` | Границы, технологии, описания Rel |
| `loss.ganttNotGraph` | Gantt не конвертируется в граф |
| `loss.dates` | Даты и календарь Gantt |
| `loss.visualOnly` | Только визуальное восстановление из SVG |
| `loss.nodeVisualMismatch` | Узел не сопоставлен с SVG |
| `loss.unsupportedKind` | Тип диаграммы не поддерживается для пары |

---

## 5. Структура файлов

```
src/services/conversion/
  diagram-ir.ts                 # типы IR, normalize, validate
  conversion-report.ts          # lossIds, confidence, blocked
  classify-diagram-kind.ts      # source → kind
  pipeline/
    convert-diagram.ts          # entry: convert(options) → result
  parse/
    parse-plantuml.ts           # facade → per-kind parsers
    parse-mermaid.ts
    parse-graphml.ts            # reuse parseGraphml + enrich
    plantuml/
      parse-component.ts
      parse-class.ts
      parse-state.ts
      parse-sequence.ts
      parse-activity.ts
      parse-c4.ts
      parse-gantt.ts
    mermaid/
      parse-flowchart.ts
      parse-class.ts
      parse-state.ts
      parse-sequence.ts
      parse-er.ts
      parse-gantt.ts
  visual/
    svg-extractor.ts            # route by svg fingerprint
    mermaid-svg-extractor.ts
    plantuml-svg-extractor.ts
    svg-metadata.ts             # read/write metadata
  merge/
    merge-diagram-ir.ts
    match-nodes.ts
  emit/
    emit-plantuml.ts
    emit-mermaid.ts
    emit-graphml.ts             # NEW serialize + visual keys
  rules/
    conversion-matrix.ts        # allowed routes + default losses per kind
    loss-analyzer.ts            # IR + route → lossIds[]

src/composables/
  useDiagramConversion.ts       # UI state, preview, apply

src/components/
  ConvertDiagramModal.vue       # target format, mode, losses, preview

src/constants/
  conversion-settings.ts        # METADATA_VERSION, confidence thresholds
```

---

## 6. API конвертера

**Файл:** `src/services/conversion/pipeline/convert-diagram.ts`

```ts
type ConversionMode = "source" | "visual" | "combo" | "auto";

interface ConvertDiagramInput {
  source: string;
  sourceFormat: DiagramFormat;
  targetFormat: DiagramFormat;
  mode: ConversionMode;
  previewSvg?: string;          // для visual/combo
  locale: AppLocale;
}

interface ConvertDiagramResult {
  ok: boolean;
  blocked?: boolean;
  targetSource?: string;
  report: ConversionReport;     // kind, level, lossIds, warnings, confidence
  ir?: DiagramIR;               // для отладки / metadata embed
}

async function convertDiagram(input: ConvertDiagramInput): Promise<ConvertDiagramResult>
```

`auto` = combo если есть `previewSvg`, иначе source.

**Правила блокировки:**

- `gantt → graphml` → blocked
- `graphml → sequence|activity|gantt` → blocked
- visual-only + sequence SVG → blocked

---

## 7. UI/UX

### 7.1 Точки входа

| Место | Действие |
|-------|----------|
| EditorToolbar | «Конвертировать…» (dropdown: PlantUML / Mermaid / GraphML) |
| После импорта файла | optional toast «Конвертировать в …?» |
| Library diagram | «Открыть как …» (отдельная фаза) |

### 7.2 ConvertDiagramModal

Шаги:

1. **Целевой формат** (disabled если blocked)
2. **Режим:** source / combo (default) / visual-only (если нет source)
3. **Дисклеймер** — список `loss.*` + уровень A/B/C badge
4. Checkbox «Понимаю потери»
5. **Превью** — textarea (readonly) + мини-SVG
6. **Применить** → `pushHistory` → смена `diagramFormat` + `source`

### 7.3 Комментарий в сгенерированном файле

```plantuml
' Generated by Code2Graph converter
' Source: mermaid flowchart → plantuml component
' Losses: subgraphs, node shapes, styles
' Date: 2026-08-08
```

### 7.4 Embed при экспорте SVG

Модифицировать `useDiagramExport.exportSvg`:

1. Взять последний `DiagramIR` из кэша рендера (`useDiagramRender`)
2. `embedSvgMetadata(svg, ir)`
3. Скачать

---

## 8. Этапы реализации

### Фаза 0 — Foundation (1 спринт)

| # | Задача | Файлы |
|---|--------|-------|
| 0.1 | Типы `DiagramIR`, `ConversionReport` | `diagram-ir.ts`, `conversion-report.ts` |
| 0.2 | `conversion-matrix.ts` — allowed/blocked/level | `rules/conversion-matrix.ts` |
| 0.3 | `loss-analyzer.ts` + i18n `conversion.ts` | locales |
| 0.4 | `classify-diagram-kind.ts` | parse facade |
| 0.5 | Unit-тесты matrix + loss analyzer | `*.test.ts` |

**Критерий:** `analyzeConversion("mermaid","plantuml","graph")` → lossIds.

---

### Фаза 1 — Graph triangle + GraphML serialize (1–2 спринта)

| # | Задача |
|---|--------|
| 1.1 | `emit-graphml.ts` — nodes, edges, optional x/y/fill keys |
| 1.2 | `parse-graphml.ts` — обёртка над `parseGraphml` → IR |
| 1.3 | `parse-component` (PUML) + `parse-flowchart` (MMD) |
| 1.4 | `emit-plantuml` component + `emit-mermaid` flowchart |
| 1.5 | `convert-diagram.ts` — source-only, kind=graph |
| 1.6 | `ConvertDiagramModal` MVP + toolbar button |
| 1.7 | Golden tests: 6 направлений graph triangle |

**Критерий:** flowchart PUML ↔ MMD ↔ GML вручную через UI.

---

### Фаза 2 — Combo merge + SVG (1 спринт)

| # | Задача |
|---|--------|
| 2.1 | `mermaid-svg-extractor.ts` |
| 2.2 | `plantuml-svg-extractor.ts` (geometry) |
| 2.3 | `merge-diagram-ir.ts` + match by label/id |
| 2.4 | Режим combo в pipeline |
| 2.5 | GraphML emit с visual keys |
| 2.6 | UI: confidence warnings в модалке |

**Критерий:** GML из MMD сохраняет цвета из превью.

---

### Фаза 3 — Class + State + ER (1 спринт)

| # | Задача |
|---|--------|
| 3.1 | Parsers + emitters class/state |
| 3.2 | MMD er ↔ GML |
| 3.3 | Расширить matrix + golden tests |
| 3.4 | Уровень B дисклеймеры |

**Критерий:** class PUML ↔ MMD; er MMD → GML.

---

### Фаза 4 — Sequence + Activity + C4 (degraded) (1 спринт)

| # | Задача |
|---|--------|
| 4.1 | sequence PUML ↔ MMD (без GML out) |
| 4.2 | activity → flowchart fallback |
| 4.3 | C4 regex parser → graph IR |
| 4.4 | Blocked routes в UI (disabled + tooltip) |

**Критерий:** sequence конвертируется с `loss.messageOrder`; GML disabled.

---

### Фаза 5 — Gantt + Metadata embed (0.5 спринта)

| # | Задача |
|---|--------|
| 5.1 | gantt PUML ↔ MMD |
| 5.2 | `svg-metadata.ts` embed on export |
| 5.3 | Import SVG → read metadata path |
| 5.4 | Кэш IR в `useDiagramRender` после parse |

**Критерий:** экспорт SVG → reimport → combo GML без потери topology.

---

### Фаза 6 — Polish (0.5 спринта)

| # | Задача |
|---|--------|
| 6.1 | Undo integration |
| 6.2 | «Сохранить как» с выбором формата |
| 6.3 | Library: convert on open (optional) |
| 6.4 | E2E: convert flowchart + accept disclaimer |
| 6.5 | README / docs |

---

## 9. Тестирование

### Unit

- Каждый parser: fixtures `src/services/conversion/__fixtures__/`
- Каждый emitter: round-trip где level ≥ B
- merge: synthetic semantic + visual
- matrix: all routes have loss set or blocked

### Integration

- `convertDiagram` end-to-end с реальными sample-diagrams
- Combo: source + SVG fixture → GraphML contains x/y

### E2E (Playwright)

1. Открыть sample flowchart MMD
2. Конвертировать в PlantUML
3. Принять дисклеймер
4. Проверить preview рендерится
5. Undo возвращает исходник

---

## 10. Зависимости фаз

```
0 ──► 1 ──► 2 ──► 6
 │      │
 │      └──► 3 ──► 4 ──► 6
 │
 └──► 5 (metadata можно параллельно с 3)
```

Рекомендуемый MVP для релиза: **фазы 0 + 1 + 2** (graph triangle + combo).

---

## 11. Риски

| Риск | Митигация |
|------|-----------|
| PlantUML SVG без id | geometry + label match; не обещать A-level |
| Парсеры DSL хрупкие | per-kind fixtures; fallback to `unknown` + graph |
| Большие диаграммы | лимит nodes/edges в конвертере (константа) |
| Пользователь ожидает без потерь | обязательный checkbox + уровень A/B/C |
| GraphML из внешних tools | tolerant parse; visual keys optional |

---

## 12. Константы (не magic numbers)

**Файл:** `src/constants/conversion-settings.ts`

```ts
export const CONVERSION_IR_VERSION = 1;
export const SVG_METADATA_ID = "code2graph-ir";
export const CONVERSION_MAX_NODES = 200;
export const CONVERSION_MAX_EDGES = 400;
export const MERGE_CONFIDENCE_THRESHOLD = 0.5;
export const MERGE_LABEL_FUZZY_MAX_DISTANCE = 2;
```

---

## 13. Чеклист готовности релиза MVP

- [ ] 6 направлений graph triangle работают (source)
- [ ] Combo сохраняет цвета в GraphML
- [ ] Модалка показывает loss ids на русском и английском
- [ ] Blocked маршруты disabled с объяснением
- [ ] Сгенерированный файл содержит header-comment
- [ ] Undo после конвертации
- [ ] ≥ 50 unit tests conversion module
- [ ] 1 e2e сценарий
