# scratchpad: LLM для vuePlantUML (Free + BYOK)

> Обновлено: 2026-08-05.
> Запросы: BYOK + guide при отсутствии ключа; бесплатный AI без ключа с выбором в настройках; default = рекомендованный.

## Цель

Интеграция облачных LLM для генерации/редактирования PlantUML:

1. **Free (без ключа)** — встроенный бесплатный провайдер через proxy; пользователь выбирает вариант в настройках.
2. **BYOK** — свой ключ для любого провайдера; без ключа → файл инструкций.
3. **Валидация** — Zod → static → engine до применения в редактор.
4. **Два режима** — wizard новой диаграммы + patch выделения с undo.

## Принципы

- Ключи пользователя: только localStorage, не в git, не в share-URL.
- Ключ proxy-сервера: только `process.env` на server, не в клиентский бандл.
- Паттерн storage как `useLibraryApiUrl`: composable + localStorage.
- **Default провайдер:** `google-gemini-free` (рекомендованный: Gemini 2.0 Flash, free tier, structured JSON).

## Два класса провайдеров

| Класс | `requiresUserKey` | Как работает |
|-------|-------------------|--------------|
| `free_builtin` | `false` | Клиент → `POST /api/llm/chat` (library server / vite proxy / same-origin) |
| `byok` | `true` | Клиент → API провайдера с ключом из Settings |

---

## Этап 0 — Константы и реестр провайдеров

**Файлы:**

- `src/constants/llm-providers.ts`
- `src/constants/llm-settings.ts`

**Поля провайдера:** `id`, `nameKey`, `kind: 'free_builtin' | 'byok'`, `requiresUserKey`, `keyUrl`, `docsUrl`, `defaultModel`, `recommended?`.

**Free builtin (без ключа пользователя):**

| id | Модель (proxy) | Почему |
|----|----------------|--------|
| `google-gemini-free` ★ | `gemini-2.0-flash` | **Рекомендованный default** — JSON mode, качество, free tier |
| `groq-free` | `llama-3.3-70b-versatile` | Быстрый fallback |
| `openrouter-free` | `:free` модель | Универсальный fallback |

★ = `DEFAULT_LLM_PROVIDER_ID`

**BYOK (ключ пользователя):**

| id | keyUrl |
|----|--------|
| `google-gemini` | https://aistudio.google.com/apikey |
| `groq` | https://console.groq.com/keys |
| `openrouter` | https://openrouter.ai/keys |
| `mistral` | https://console.mistral.ai/api-keys |

**Storage keys:** `STORAGE_KEY_LLM_PROVIDER`, `STORAGE_KEY_LLM_API_KEYS`, `STORAGE_KEY_LLM_CONSENT`.

**Критерий готовности:** типы + константы + `getDefaultLlmProviderId()` → `google-gemini-free`.

---

## Этап 1 — Файл инструкций + открытие (для BYOK)

**Файлы:**

- `docs/llm-api-keys.md`
- `public/llm-api-keys.html` (якоря `#google-gemini`, `#groq`, …)
- `src/composables/useLlmKeysGuide.ts`
- `src/components/LlmKeysGuideModal.vue` (fallback)

**Composable:**

```ts
openLlmKeysGuide(providerId?: string): void
  // window.open(`./llm-api-keys.html#${providerId}`)
  // popup blocked / single-file → LlmKeysGuideModal
```

**Single-file релиз:** zip с `vueplantuml.html` + `llm-api-keys.html`.

**Критерий готовности:** кнопка «Как получить ключ» открывает guide (только для BYOK-провайдеров).

---

## Этап 2 — Server LLM proxy (для Free без ключа)

**Файлы:**

- `server/src/config.ts` — `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (optional)
- `server/src/routes/llm.ts` — `POST /api/llm/chat`
- `server/src/index.ts` — mount route

**Поведение proxy:**

- Body: `{ providerId, messages, jsonMode }`
- Разрешены только `free_builtin` provider ids
- Rate limit: N req/min/IP (константа в config)
- Ключи только из `process.env`, не логировать
- Без server key для провайдера → 503 + понятная ошибка в UI

**Клиент:** `resolveLlmProxyBaseUrl()` = library API URL (`useLibraryApiUrl`) или same-origin `/api` (vite dev proxy).

**Критерий готовности:** `curl POST /api/llm/chat` с `google-gemini-free` возвращает ответ.

---

## Этап 3 — Settings UI: провайдер + BYOK + consent

**Файлы:**

- `src/composables/useLlmSettings.ts` — active provider, consent, setProvider
- `src/composables/useLlmApiKeys.ts` — map ключей BYOK
- `src/utils/llm-key-storage.ts` — Zod parse

**SettingsModal — секция «AI / LLM»:**

1. **Select «Провайдер AI»** — все провайдеры; free помечены «(без ключа)», BYOK — «(свой ключ)»; рекомендованный с badge «рекомендован».
2. **Default при первом запуске:** `google-gemini-free`.
3. Поле API key — **только** если выбран `byok` провайдер.
4. Индикатор ключа / кнопки «Удалить ключ», «Как получить ключ» (BYOK only).
5. Checkbox consent: «Согласен отправлять PlantUML в облачный LLM».
6. Hint для free: «Ключ не нужен; используется сервер приложения (адрес библиотеки или этот сайт)».
7. Кнопка «Проверить подключение» (этап 6).

**Критерий готовности:** смена провайдера в Settings сохраняется; UI key скрыт для free_builtin.

---

## Этап 4 — Gate: `requireLlmAccess()`

**Файл:** `src/composables/useLlmGate.ts`

```ts
type LlmGateResult =
  | { ok: true; mode: 'free'; providerId; proxyBaseUrl }
  | { ok: true; mode: 'byok'; providerId; apiKey }
  | { ok: false; reason: 'no_consent' | 'no_key' | 'no_proxy' | 'provider_invalid' }
```

**Порядок:**

1. Consent? → нет → alert + Settings
2. Provider valid?
3. Если `free_builtin`:
   - `resolveLlmProxyBaseUrl()` доступен? → нет → hint «настройте сервер библиотеки или откройте сайт с API»
   - return `mode: 'free'`
4. Если `byok`:
   - `hasApiKey`? → нет → `openLlmKeysGuide(provider)` + «Открыть настройки?»
   - return `mode: 'byok'`

**Критерий готовности:** free работает без ключа; BYOK без ключа открывает guide.

---

## Этап 5 — Валидация ответа LLM (Zod + PlantUML)

**Зависимость:** `zod` (или `valibot`).

**Файлы:**

- `src/schemas/plantuml-llm-output.ts`
- `src/utils/validate-llm-plantuml.ts`

**Pipeline:**

1. JSON + Zod (`plantuml`, optional `explanation`)
2. `checkPlantUmlSyntax()`
3. `validatePlantUmlSyntax()`
4. Policy: whitelist `!include` → `./plantuml-lib/`

Retry: max 2 с `validation_errors` в follow-up.

**Критерий готовности:** тесты на битый JSON и PlantUML.

---

## Этап 6 — `useEditorHistory` (undo для AI)

**Файл:** `src/composables/useEditorHistory.ts`

- `push`, `undo`, `redo`, `canUndo`, `canRedo`, лимит 50
- Toolbar + Ctrl+Z / Ctrl+Y на `source` в App.vue

**Критерий готовности:** undo после mock-apply.

---

## Этап 7 — LLM client (unified free + BYOK)

**Файлы:**

- `src/services/llm/llm-client.ts` — `chat({ system, user, jsonMode })`
- `src/services/llm/proxy-client.ts` — free_builtin → `/api/llm/chat`
- `src/services/llm/providers/*.ts` — BYOK direct

**Routing:**

```
requireLlmAccess()
  → mode free  → proxy-client
  → mode byok  → provider direct
```

System prompt: JSON only, PlantUML rules, C4 include policy.

**Критерий готовности:** «Проверить подключение» в Settings для free и BYOK.

---

## Этап 8 — Режим 2: Patch выделения

**UI:** `LlmPatchModal.vue`

- Selection + prompt → gate → LLM → validate → preview diff + SVG
- Apply → history.push → update source
- «Отменить» → undo

**DiagramEditor:** `selectionChange`, toolbar «AI изменить».

**Критерий готовности:** patch через free default и через BYOK.

---

## Этап 9 — Режим 1: Wizard новой диаграммы

**UI:** `DiagramWizardModal.vue` — stepper

- Тип → стиль → контекст → type-specific → промт → generate
- gate на Generate → apply + undo

**Критерий готовности:** sequence/C4 с нуля через wizard.

---

## Этап 10 — i18n, polish, релиз ✅

- `messages.ts`: about AI section
- `APP_LINKS.llmApiKeysGuide` — используется в About и Settings
- `build-single-html.mjs` / `build-single-only.mjs` — копируют `llm-api-keys.html`
- `npm run build:release` → `release/vueplantuml.html` + companion files
- `README.md`, `publish/README.md`, `server/README.md`

---

## Диаграмма gate (free + BYOK)

```
[AI action]
    → consent? ─no→ alert → Settings
    → provider kind?
        free_builtin → proxy URL ok? ─no→ hint (library server / hosted site)
                      └─yes→ POST /api/llm/chat
        byok → user key? ─no→ open llm-api-keys.html → Settings?
               └─yes→ direct API
    → Zod + PlantUML validate
    → apply + undo stack
```

---

## Зависимости этапов

```
0 → 1 ─┐
0 → 2 ─┼→ 3 → 4 → 5 ─┐
         └→ 3         ├→ 7 → 8 → 9 → 10
              6 ───────┘
```

Параллель после 0: **1** (guide), **2** (proxy), **5** (history), **6** (undo naming - actually stage 6 is history in new plan).

Wait I have stage 6 as history and 7 as client. Let me fix dependencies in scratchpad:

0 → 1, 2 (parallel)
0, 2 → 3
3 → 4
4, 5 parallel after 3? 5 is validation, 6 is history
3, 5, 6 → 7
7 → 8 → 9 → 10

Actually:
- 5 validation can parallel with 6 history after 4? validation doesn't need gate fully - can start after 0
- 7 needs 3, 4, 5, 6

Dependencies:
```
0 → 1, 2 (parallel)
0 → 3 (needs 0)
2 → 3 (free path needs proxy)
1 → 3 (BYOK guide integration in settings)
3 → 4
0 → 5 (validation - can parallel early)
3, 5 → 7
6 can parallel with 5
7 → 8 → 9 → 10
```

I'll keep the dependency section clean in the file.

---

## Ограничения и fallback

| Сценарий | Поведение |
|----------|-----------|
| `file://` single HTML, нет server | Free AI недоступен → подсказка: BYOK или hosted site |
| Server без `GEMINI_API_KEY` | `google-gemini-free` disabled в UI или ошибка при тесте |
| User выбрал BYOK без ключа | Guide + Settings, не fallback на free автоматически (явный выбор провайдера) |

---

## Не делать в v1

- Автоматический fallback free → BYOK без уведомления пользователя
- Вшивать proxy API keys в клиентский JS
- Отправка user BYOK ключей на library server

---

# scratchpad: конвертер диаграмм «всё → всё»

> Обновлено: 2026-08-08  
> Полный план: [`docs/diagram-converter-plan.md`](docs/diagram-converter-plan.md)

## Суть

Три формата (`plantuml`, `mermaid`, `graphml`) × типы диаграмм, с **дисклеймером потерь**.

Три слоя: **semantic (source)** + **visual (SVG)** + **metadata (embed в export SVG)** → merge → emit.

## MVP (релиз 1)

Фазы **0 + 1 + 2** из плана:

1. `DiagramIR` + matrix потерь + i18n
2. Graph triangle: component/flowchart ↔ все форматы
3. Combo: source + live SVG → GraphML с x/y/fill

## Заблокировано всегда

- gantt → graphml
- graphml → sequence / activity / gantt
- visual-only sequence SVG

## Следующий шаг в коде

Фаза 0: `src/services/conversion/diagram-ir.ts` + `rules/conversion-matrix.ts`

---

# scratchpad: полный рефакторинг кодовой базы vuePlantUML

> Обновлено: 2026-08-08  
> Статус: **план** (код не менялся)  
> Контекст: Vue 3 SPA + Hono/SQLite server, offline PWA, single-IIFE build

## 1. Цель и границы

### Цель

Привести кодовую базу к **модульной feature-архитектуре** с чёткими границами слоёв, снизить стоимость изменений и поднять тестируемость — **без регрессий** в offline/`file://`, single-html релизе и library sync.

### Не цель

- Переписывание с нуля или смена стека (Vue 3, Vite, Hono остаются)
- Массовый редизайн UI
- Рефакторинг conversion pipeline «ради красоты» (уже лучший подсистемный образец)
- Монорепо с npm publish пакетами (достаточно workspace `shared/` внутри репо)

### Ограничения (нельзя ломать)

| Ограничение | Почему |
|-------------|--------|
| `build:single` / `build:release` | Android `file://`, релиз `vueplantuml.html` |
| Offline-first | Нет гарантии API; localStorage + IndexedDB |
| Library dual-mode | Local IDB ↔ remote API, `libraryTarget` |
| i18n ru/en parity | `npm run check:i18n` в CI |
| PWA / service worker | `public/sw.js`, install flow |

---

## 2. Текущее состояние (диагностика)

### Стек и масштаб

- **Frontend:** ~257 файлов в `src/`, 50 Vue-компонентов, 44 composables
- **Server:** ~3.4k строк в routes + domain (`server/src/`)
- **Тесты:** 27 unit (Vitest), 7 e2e (Playwright); **0 server tests**, **0 component tests**
- **Lint:** только `src/**/*.ts` — Vue SFC не линтятся

### Эталоны (не трогать первыми, использовать как образец)

| Модуль | Почему эталон |
|--------|---------------|
| `src/services/conversion/` | parse → merge → emit, IR, matrix, тесты |
| `src/components/DiagramEditor.vue` (~380 строк) | Делегирует composables + subcomponents |
| `useDiagramRender` → `services/diagram-render.ts` | Правильный composable → service |

### Топ-10 болевых точек

| # | Проблема | Файл(ы) | Строк |
|---|----------|---------|------:|
| 1 | God route — HTTP + SQL + authz + ratings + versions | `server/src/routes/diagrams.ts` | 1199 |
| 2 | God modal — browse/upload/admin/share/subscriptions | `DiagramLibraryModal.vue` | 1018 |
| 3 | God modal — wizard AI/manual | `DiagramWizardModal.vue` | 1007 |
| 4 | God modal — settings + LLM + library + PWA | `SettingsModal.vue` | 970 |
| 5 | Monolithic REST client | `src/utils/diagram-api.ts` | 854 |
| 6 | Дублирование PlantUML/Mermaid utils | `plantuml-*` vs `mermaid-*` | ~3k+ |
| 7 | Client/server copy-paste | `section-tree`, `puml-files` | 2× |
| 8 | Constants + runtime logic | `constants/llm-wizard.ts` | 1618 |
| 9 | `utils/` как свалка (API, stores, engines) | `src/utils/` | ~7200 |
| 10 | Нет типобезопасных i18n ключей | `locales/types.ts` | — |

### Слои сегодня vs целевые

```
СЕЙЧАС                          ЦЕЛЬ
──────                          ────
utils/ (всё подряд)      →      core/utils (чистые функции)
composables/ (400+ строк) →     composables (только Vue glue)
services/ (частично)     →      services/ + features/*/services
constants/ (логика)      →      data/ + services/
components/ (god modals) →      features/*/components
```

---

## 3. Целевая архитектура

```
/workspace
├── packages/shared/              # NEW: общий код client + server
│   ├── section-tree.ts
│   ├── puml-files.ts
│   └── types/                    # DTO, DiagramFormat, …
├── src/
│   ├── features/
│   │   ├── editor/               # DiagramEditor, folds, autocomplete UI
│   │   ├── preview/              # DiagramPreview, pan-zoom
│   │   ├── library/              # modal flow, API, IDB, все library/*
│   │   ├── llm/                  # wizard, patch, providers, gate
│   │   ├── conversion/           # перенос services/conversion/
│   │   └── settings/             # SettingsModal по вкладкам
│   ├── formats/
│   │   ├── plantuml/             # engine, syntax, highlight, autocomplete
│   │   ├── mermaid/
│   │   └── graphml/
│   ├── core/                     # i18n, safe-storage, export primitives, App shell
│   └── App.vue                   # тонкий: wire features + modal registry
└── server/
    ├── routes/                   # тонкие handlers
    ├── services/                 # diagrams, sections, ratings, …
    ├── db/
    └── auth/
```

### Контракт `FormatHandler` (ключевая абстракция)

```ts
interface FormatHandler {
  id: DiagramFormat;
  validate(source: string): ValidationResult;
  highlight(source: string): HighlightTokens;
  autocomplete(source: string, pos: number): Completion[];
  encode(source: string): string;
  render(source: string, options: RenderOptions): Promise<RenderResult>;
}
```

Реализации: `PlantUmlFormatHandler`, `MermaidFormatHandler`, `GraphmlFormatHandler`.  
Composables (`useSyntaxValidation`, `useEditorAutocomplete`, `useDiagramRender`) работают через фабрику `getFormatHandler(format)`.

### Контракт Library API (разбивка `diagram-api.ts`)

```
services/library/api/
├── client.ts          # base fetch, errors, auth headers
├── diagrams.ts
├── sections.ts
├── auth.ts
├── ratings.ts
├── subscriptions.ts
└── versions.ts
```

---

## 4. Фазы рефакторинга

### Фаза 0 — Инфраструктура и страховка (приоритет: критический)

**Цель:** безопасная среда для последующих изменений.

| Задача | Файлы / действия | Критерий готовности |
|--------|------------------|---------------------|
| 0.1 ESLint для Vue | `eslint.config.js`, `eslint-plugin-vue` | `npm run lint` покрывает `src/**/*.{ts,vue}` |
| 0.2 Server Vitest | `server/vitest.config.ts`, `server/package.json` | `npm --prefix server run test` зелёный |
| 0.3 Baseline e2e | существующие 7 Playwright specs | проходят после каждой фазы |
| 0.4 Refactoring checklist | `docs/REFACTORING.md` | чеклист smoke: build:single, offline, library local |
| 0.5 Метрики | скрипт или CI step | отчёт: max file size, test count |

**Зависимости:** нет.  
**Риск:** низкий.

---

### Фаза 1 — Shared package (дедупликация client/server)

**Цель:** единый источник правды для общей логики.

| Задача | Действие |
|--------|----------|
| 1.1 Создать `packages/shared/` | workspace в root `package.json` |
| 1.2 Перенести `section-tree` | удалить дубли в `src/shared/` и `server/src/shared/` |
| 1.3 Перенести `puml-files` | то же |
| 1.4 Общие DTO типы | `DiagramSummary`, `SectionNode`, … |
| 1.5 Тесты shared | unit на `section-tree`, `puml-files` |

**Критерий:** `npm run typecheck:all` + тесты shared.  
**Риск:** средний (import paths, tsconfig paths).  
**Откат:** revert одного PR.

---

### Фаза 2 — API layer (клиент)

**Цель:** разбить `diagram-api.ts`, добавить contract tests.

| Задача | Из | В |
|--------|----|---|
| 2.1 Base client | `diagram-api.ts` | `services/library/api/client.ts` |
| 2.2 Domain clients | то же | `diagrams.ts`, `sections.ts`, … |
| 2.3 Error type | разрозненные throw | `LibraryApiError` с code + i18n key |
| 2.4 Re-export facade | — | `diagram-api.ts` deprecated wrapper (1 релиз) |
| 2.5 Contract tests | — | mock fetch, покрыть auth/retry/errors |

**Критерий:** все 22 импортёра `diagram-api` работают; e2e library preview зелёный.  
**Риск:** средний (library sync edge cases).

---

### Фаза 3 — Server: тонкие routes + services

**Цель:** `routes/diagrams.ts` ≤ 300 строк.

| Задача | Действие |
|--------|----------|
| 3.1 `server/services/diagrams-service.ts` | CRUD, favorites, share links |
| 3.2 `server/services/diagram-versions-service.ts` | версии (частично есть `diagram-versions.ts`) |
| 3.3 Разбить `routes/diagrams.ts` | handlers по ресурсам |
| 3.4 Тесты authz | pure functions из `authz.ts` |
| 3.5 Request validation | Zod schemas для body/query (как на клиенте) |
| 3.6 Унифицировать subscriptions | `subscriptions.ts` vs `routes/subscriptions.ts` |

**Критерий:** server unit tests ≥ 30; ручной smoke library CRUD.  
**Риск:** высокий (authz matrix 430 строк).

---

### Фаза 4 — Format abstraction

**Цель:** убрать дублирование PlantUML/Mermaid, единый вход для editor/preview.

| Задача | Действие |
|--------|----------|
| 4.1 `FormatHandler` interface | `src/formats/types.ts` |
| 4.2 PlantUML handler | собрать из `plantuml-*` utils |
| 4.3 Mermaid handler | собрать из `mermaid-*` utils |
| 4.4 GraphML handler | graphml utils + engine |
| 4.5 Миграция composables | `useSyntaxValidation`, `useEditorAutocomplete`, `useDiagramRender` |
| 4.6 Shared primitives | общий tokenizer/highlight base где возможно |

**Критерий:** нет прямых импортов `plantuml-autocomplete` из composables; unit tests handlers.  
**Риск:** средний (autocomplete 749 строк, highlight 589).

**Не трогать:** `services/conversion/` — только адаптировать emit/parse к `FormatHandler` при необходимости.

---

### Фаза 5 — God modals → feature modules

**Цель:** модалки ≤ 400 строк template + orchestration composable.

#### 5A — Library (самый большой риск)

| Шаг | Действие |
|-----|----------|
| 5A.1 | `useLibraryModalFlow.ts` — tabs, auth state, open/close |
| 5A.2 | `features/library/` — перенос `components/library/*` |
| 5A.3 | `DiagramLibraryModal.vue` → thin shell |
| 5A.4 | E2E: browse, upload, share link |

#### 5B — Settings

| Шаг | Действие |
|-----|----------|
| 5B.1 | Вкладки: `SettingsGeneralTab`, `SettingsLlmTab`, `SettingsLibraryTab` |
| 5B.2 | `useSettingsTabs.ts` |

#### 5C — Wizard

| Шаг | Действие |
|-----|----------|
| 5C.1 | Вынести prompt builders из `llm-wizard.ts` → `services/llm/wizard/` |
| 5C.2 | Step components: `WizardTypeStep`, `WizardContextStep`, … |
| 5C.3 | `useDiagramWizardFlow.ts` |

**Критерий:** каждая modal ≤ 400 строк; функциональность 1:1.  
**Риск:** высокий (user-visible, много табов).

---

### Фаза 6 — Composables downsizing

**Цель:** composables ≤ 200 строк, логика в services.

| Composable | Строк | Куда переносить |
|------------|------:|-----------------|
| `usePreviewPanZoom` | 480 | `services/preview/pan-zoom.ts` |
| `useLlmPlantUmlGenerate` | 435 | `services/llm/generate.ts` |
| `useLibraryMutations` | 353 | `services/library/mutations.ts` |
| `useLibraryTransfer` | ~300 | `services/library/transfer.ts` |

**Критерий:** composables только `ref`/`computed`/`watch` + вызовы service.

---

### Фаза 7 — Storage consolidation

**Цель:** вся persistence в `storage/`, не в `utils/`.

| Из | В |
|----|---|
| `utils/diagram-store.ts` | `storage/diagram-store.ts` |
| `utils/diagram-version-store.ts` | `storage/diagram-versions.ts` |
| `utils/snippet-store.ts` | `storage/snippets.ts` |

**Критерий:** `utils/` не содержит store-модулей.

---

### Фаза 8 — i18n type safety

| Задача | Действие |
|--------|----------|
| 8.1 | `as const` keys в `en/index.ts` → `LocaleKey` union |
| 8.2 | `t(key: LocaleKey)` в `useLocale` |
| 8.3 | `check-i18n-keys.mjs` — проверка использования |
| 8.4 | Wizard/sample strings → locales где UI-facing |

---

### Фаза 9 — App.vue slim + modal registry

**Цель:** `App.vue` ≤ 250 строк.

| Задача | Действие |
|--------|----------|
| 9.1 | `useAppShell.ts` — document, render, history wiring |
| 9.2 | `AppModalHost.vue` расширить — единый registry модалок |
| 9.3 | Убрать 15 прямых import модалок из App |

---

### Фаза 10 — Cleanup & deprecation removal

| Задача | Файл |
|--------|------|
| Удалить deprecated storage key | `constants.ts` `STORAGE_KEY_DARK` |
| Удалить deprecated sample helpers | `sample-diagrams.ts` |
| Удалить deprecated autocomplete | `plantuml-autocomplete.ts` symbol |
| Удалить deprecated authz | `authz.ts` wrapper |
| Удалить deprecated `diagram-api.ts` facade | после фазы 2 + 1 релиз |

---

## 5. Граф зависимостей фаз

```
0 (tooling)
 ├→ 1 (shared)
 │    └→ 3 (server)
 ├→ 2 (api client) ─→ 5A (library modal)
 ├→ 4 (format handler) ─→ 5B, 5C (меньше дублей в wizard/settings)
 ├→ 8 (i18n) — параллельно с 4–6
 └→ 9 (App shell) — после 5

5 (modals) → 6 (composables) → 7 (storage) → 10 (cleanup)
```

**Параллельные треки после фазы 0:**

- Трек A: 1 → 3 (backend)
- Трек B: 2 → 5A (library)
- Трек C: 4 → 5B/5C (formats + modals)
- Трек D: 8 (i18n, независимо)

---

## 6. Стратегия тестирования

| Слой | Минимум после рефакторинга |
|------|---------------------------|
| `packages/shared` | 100% pure functions |
| `server/services` | authz matrix, ratings, CRUD happy path |
| `services/library/api` | contract tests (mock fetch) |
| `formats/*` | validate, highlight smoke |
| `services/conversion` | сохранить + fixtures |
| Composables | критичные: library auth, LLM gate, editor history |
| E2E | + library auth, settings LLM tab (smoke) |
| Build | CI: `build:release` + `typecheck:all` |

**Правило:** каждая фаза = PR + тесты + green CI. Без «big bang» merge.

---

## 7. Метрики успеха

| Метрика | Сейчас | Цель |
|---------|--------|------|
| Max file size | 1618 строк | ≤ 500 (исключая `data/*.ts` samples) |
| God modals (>800) | 3 | 0 |
| God routes (>800) | 1 | 0 |
| Server tests | 0 | ≥ 50 |
| Vue lint coverage | 0% | 100% |
| Дубли client/server | 2 модуля | 0 |
| `utils/` строк | ~7200 | ≤ 3000 |

---

## 8. Риски и митигация

| Риск | Митигация |
|------|-----------|
| Single-IIFE build ломается | `build:release` в CI каждого PR |
| Library sync regressions | contract tests + e2e library |
| Offline `file://` | ручной чеклист Android |
| Authz bugs на server | unit tests matrix до переноса routes |
| Scope creep | строго по фазам; conversion не трогать без нужды |
| Singleton composables | `provide/inject` optional для тестов |

---

## 9. Что НЕ рефакторить

- `public/plantuml-lib/C4/*` — vendor
- `scripts/build-*.mjs` — только при необходимости новых путей
- `services/conversion/` внутренняя структура — уже хорошая
- `DiagramEditor.vue` — эталон; менять последним при необходимости

---

## 10. Первые 3 PR (рекомендуемый старт)

1. **PR-1:** Фаза 0 — ESLint Vue + server Vitest scaffold + `docs/REFACTORING.md`
2. **PR-2:** Фаза 1 — `packages/shared` (section-tree, puml-files)
3. **PR-3:** Фаза 2 — split `diagram-api.ts` + contract tests

После PR-3 оценить метрики и скорректировать порядок фаз 5A vs 4.

---

## 11. Оптимизация UI

> Обновлено: 2026-08-08  
> Дополнение к плану рефакторинга. Связано с фазами 5 (modals), 9 (App shell), 8 (i18n).

### 11.1 Текущее состояние UI

**Сильные стороны:**
- CSS-переменные + `[data-theme="light|dark"]` в `src/styles/app.css`
- Разделение UI-темы и темы диаграммы (`uiDarkMode` / `diagramDarkMode`)
- Debounced render, pan/zoom preview (`usePreviewPanZoom`), long-press tooltips
- Широкое покрытие i18n через `useLocale()`

**Слабые стороны:**
- ~25 dialog-поверхностей, нет единого modal stack
- 11 модалок монтируются из `App.vue` сразу (тяжёлые SFC в бандле)
- `AppModal` без focus trap, Escape, restore focus
- Параллельные CSS-токены в `library-modal.css` (`--border-color`, `#f5a623`)
- Дубли `.sr-only`, `.settings-field` в 3+ файлах
- Mobile ≤900px: editor + preview в колонку — preview может быть слишком низким
- Editor highlight: `v-for` + `v-html` на каждую строку без виртуализации
- Library list: flat `v-for` без pagination/virtual scroll

### 11.2 Целевая UI-архитектура

```
src/
├── styles/
│   ├── app.css              # tokens, layout, theme
│   ├── utilities.css        # .sr-only, .visually-hidden
│   └── components/          # .btn, .settings-field, .empty-state
├── ui/
│   ├── AppModal.vue         # + useModalA11y, focus trap
│   ├── ModalStackHost.vue   # z-index, Escape, scroll-lock
│   ├── LoadingState.vue
│   ├── EmptyState.vue
│   ├── TooltipProvider.vue  # один teleport вместо N tooltips
│   └── ResponsiveTabs.vue   # editor/preview на mobile
└── features/*/components/   # feature-specific UI
```

**Связь с code-рефакторингом:**

| UI-задача | Code-фаза |
|-----------|-----------|
| Settings tabs | 5B |
| Library breadcrumbs + subviews | 5A |
| Wizard progress bar + steps | 5C |
| Modal registry | 9 |
| Lazy modals | 9 + PR после фазы 0 |

---

### 11.3 Фазы UI-оптимизации

#### UI-0 — Design system cleanup (низкий риск)

| Задача | Действие | Файлы |
|--------|----------|-------|
| UI-0.1 | Унифицировать токены library → global | `library-modal.css` → `--border`, `--accent` |
| UI-0.2 | Вынести utilities | `styles/utilities.css`: `.sr-only`, pressed states |
| UI-0.3 | Токены overlay/star | `--overlay`, `--star-active` в `app.css` |
| UI-0.4 | Размеры кнопок | `--btn-sm: 32px`, `--btn-md: 40px`, `--btn-touch: 44px` |
| UI-0.5 | Заменить emoji-иконки | `AppHeader` ⚙ → `ActionIcon`; звёзды → SVG |

**Критерий:** library modal визуально一致ен в light/dark; нет hardcoded `#ddd` / `#f5a623`.

---

#### UI-1 — Accessibility (P0, критический)

| Задача | Действие |
|--------|----------|
| UI-1.1 | `useModalA11y(open, dialogRef)` — focus trap, Escape, restore focus |
| UI-1.2 | `aria-labelledby` через `useId()`, не `title` string |
| UI-1.3 | Scroll-lock body при открытой модалке |
| UI-1.4 | Skip link «Перейти к редактору» |
| UI-1.5 | Landmarks: `role="region"` + `aria-label` для editor/preview |
| UI-1.6 | Wizard radiogroup: native `<input type="radio">` или roving tabindex |
| UI-1.7 | Close button: `ActionIcon` + min 44×44px touch target |
| UI-1.8 | i18n aria: `LibraryStarRating` — `ratingOutOfFive`, `starN` |

**Критерий:** axe-core / Lighthouse a11y ≥ 90 на главном экране; Tab не уходит за модалку.

**Файлы:** `AppModal.vue`, `DiagramLibraryModal.vue`, `DiagramWizardModal.vue`, `AppHeader.vue`.

---

#### UI-2 — Performance UI (P1)

| Задача | Проблема | Решение |
|--------|----------|---------|
| UI-2.1 | 11 modals always imported | `defineAsyncComponent` + `v-if="open"` в App |
| UI-2.2 | Editor highlight O(n) строк | Debounce 50ms; virtual scroll при >200 строк |
| UI-2.3 | Library flat list | `content-visibility: auto` или `@tanstack/vue-virtual` при >50 |
| UI-2.4 | N tooltip teleports | `TooltipProvider` — один floating element |
| UI-2.5 | Preview jank на больших SVG | Skeleton overlay при `isRendering`; `will-change: transform` |
| UI-2.6 | `source` в закрытых modals | Передавать props только при `open` |

**Критерий:** Lighthouse Performance на mobile ≥ 80; TTI не растёт после lazy modals.

**Метрики:**
- Initial JS: −15% после lazy Settings/Library/Wizard
- Editor input latency: <16ms (highlight async)
- Library scroll: 60fps при 200+ диаграммах

---

#### UI-3 — Responsive & Mobile UX (P1–P2)

| Задача | Действие |
|--------|----------|
| UI-3.1 | **Editor/Preview tabs** на ≤900px вместо stack | `ResponsivePanelTabs` в `App.vue` |
| UI-3.2 | Min-height панелей | `min-height: 40vh` per panel |
| UI-3.3 | Resizable split на desktop | drag divider между editor/preview |
| UI-3.4 | Toolbar overflow menu | `⋯` на narrow: File / Edit / AI / Export clusters |
| UI-3.5 | Preview FAB | sticky toggle «Показать превью» при фокусе в editor |
| UI-3.6 | Double-tap-to-fit + zoom % | `usePreviewPanZoom` |
| UI-3.7 | `safe-area-inset-bottom` | `.status-bar`, modals footer |
| UI-3.8 | PWA install banner | dismissible bottom sheet (first visit) |
| UI-3.9 | Snippets → bottom sheet | на mobile вместо floating overlay |
| UI-3.10 | `touch-action` | `manipulation` на toolbar scroll, `none` только на preview viewport |

**Критерий:** usable на 390×844 (iPhone) landscape + portrait; Playwright mobile viewport smoke.

---

#### UI-4 — UX крупных модалок (P1, связано с фазой 5)

**Settings (`SettingsModal` → tabs):**

| Вкладка | Содержимое |
|---------|------------|
| Редактор | шрифт, размер, подсветка, autocomplete |
| Рендер | layout, render mode, diagram dark |
| AI / LLM | провайдер, ключ, consent, test connection |
| Библиотека | API URL, profiles, sync |
| Язык | locale |

- Sticky tab bar
- Banner «API key missing» на вкладке AI
- Keyboard: `1-5` для переключения вкладок (optional)

**Library (`DiagramLibraryModal` → subviews):**

```
Browse → Section → Diagram detail
         ↑ breadcrumbs: All > Backend > api.puml
```

- Текстовые labels у mode tabs (browse/upload/admin) на ширине >480px
- Persist browse position при close/reopen
- Pagination / infinite scroll в diagram list

**Wizard (`DiagramWizardModal`):**

- Progress bar (не только «step 2 of 7»)
- Inline drawer для API key (не закрывать wizard)
- Live preview после выбора типа диаграммы
- Onboarding tooltip для fold regions (first-run)

---

#### UI-5 — Состояния загрузки и пустые экраны (P2)

Единые компоненты:

```vue
<LoadingState :message="t('preview.rendering')" />
<EmptyState
  :title="t('library.emptyTitle')"
  :description="t('library.emptyHint')"
  :action="{ label: t('library.upload'), onClick: openUpload }"
/>
```

| Место | Сейчас | Цель |
|-------|--------|------|
| Preview rendering | `…` в status bar | skeleton в frame + status |
| Library empty | текст | icon + CTA upload |
| Wizard generate | spinner в кнопке | full-area progress |
| Syntax validation | modal only | inline gutter markers (future) |

---

#### UI-6 — Modal stack & z-index (P2)

```ts
// useModalStack.ts
pushModal(id, { onClose, layer: 'default' | 'above-library' })
popModal()           // Escape / backdrop
topModal()           // для focus trap
```

- Единый scroll-lock
- Escape закрывает верхнюю модалку
- Z-index автоматический: `base + stack.length * 10`
- Заменить ручной `layer="above-library"`

---

### 11.4 Матрица приоритетов UI

| Приоритет | Область | Задачи | Effort |
|:---------:|---------|--------|:------:|
| **P0** | A11y | UI-1 (focus trap, aria, skip link) | M |
| **P1** | Performance | UI-2.1–2.3 (lazy modals, virtual list, debounce highlight) | M |
| **P1** | UX modals | UI-4 (settings tabs, library breadcrumbs) | L |
| **P1** | Visual | UI-0 (token unification) | S |
| **P2** | Mobile | UI-3 (tabs, overflow toolbar, safe-area) | M |
| **P2** | States | UI-5 (LoadingState, EmptyState) | S |
| **P2** | Architecture | UI-6 (modal stack) | M |
| **P3** | Polish | UI-3.6 zoom %, onboarding tooltips, keyboard shortcuts doc | S |

S = 1–2 дня агента, M = 3–5, L = 5+ (связано с code phase 5)

---

### 11.5 Метрики успеха UI

| Метрика | Сейчас (оценка) | Цель |
|---------|-----------------|------|
| Lighthouse Accessibility | ~70 | ≥ 90 |
| Lighthouse Performance (mobile) | ~75 | ≥ 85 |
| Modal a11y violations | focus trap 0/25 | 25/25 |
| Hardcoded UI strings | ~10 мест | 0 |
| CSS token drift (library) | ~15 overrides | 0 |
| Touch target <44px | close btn, some icons | 0 |
| God modal max height UX | 1 scroll >3 screens | ≤1 screen per tab |

---

### 11.6 Интеграция с code-рефакторингом

```
Code Phase 0 ──→ UI-0 (tokens) + UI-1 (a11y composable)
Code Phase 5A ──→ UI-4 Library subviews + UI-3.1 mobile tabs
Code Phase 5B ──→ UI-4 Settings tabs
Code Phase 5C ──→ UI-4 Wizard progress
Code Phase 9  ──→ UI-2.1 lazy modals + UI-6 modal stack
```

**Рекомендуемый порядок UI-PR:**

1. **UI-PR-1:** `useModalA11y` + fix `AppModal` (P0, не ломает layout)
2. **UI-PR-2:** Token unification library CSS (P1, visual only)
3. **UI-PR-3:** `LoadingState` / `EmptyState` + preview skeleton
4. **UI-PR-4:** Settings tabs (вместе с code phase 5B)
5. **UI-PR-5:** Mobile editor/preview tabs
6. **UI-PR-6:** Lazy modals + virtual library list

---

### 11.7 Что НЕ менять в UI без веской причины

- Pan/zoom gesture model (`usePreviewPanZoom`) — работает хорошо
- Long-press tooltips на icon-only toolbar — правильный mobile pattern
- 50/50 desktop grid — менять только с resizable split
- Разделение UI/diagram dark mode — не объединять в один toggle
- Lucide/ActionIcon система — расширять, не заменять

---

### 11.8 Чеклист ручного UI-теста (добавить в `docs/REFACTORING.md`)

- [ ] Light/dark: App, Settings, Library, Wizard
- [ ] Mobile portrait: editor tabs, toolbar scroll, preview pan/zoom
- [ ] Mobile landscape: toolbar не перекрывает editor
- [ ] Keyboard: Tab в модалке, Escape закрывает, undo/redo
- [ ] Screen reader: modal title announced, close button labeled
- [ ] PWA install flow (Chrome Android)
- [ ] `file://` single-html: modals, tooltips, offline banner
- [ ] Long diagram (500+ lines): editor scroll smooth
- [ ] Library 100+ diagrams: list scroll 60fps
