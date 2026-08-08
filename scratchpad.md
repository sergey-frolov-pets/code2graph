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
