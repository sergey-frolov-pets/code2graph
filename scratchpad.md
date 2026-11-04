# План рефакторинга и эволюции мастера диаграмм

## Раздел 1. Мастер новых диаграмм: галерея примеров с тегами (актуализировано)

Статус: решения 1–11 реализованы; действие «Задать параметры» (`params`) и шаги ручного задания параметров (`direction`, `params`, `prompt`) удалены из мастера.

### Актуальные решения по мастеру

1. У каждого примера в галерее **два действия**: «В редактор» (`editor`) и «Спросить модель» (`llm`). Кнопка «Задать параметры» и код ручного задания параметров из мастера убраны.
2. Фильтр по И: пример виден, только если содержит каждый выбранный тег.
3. Размер тега в облаке растёт с числом примеров, у которых он есть. Цвет тега задаёт ось: язык, тип, семейство, область, настройка. Цвета берутся из токенов темы, по одному на ось.
4. Первый выпуск — текущие примеры (~70).
5. Миниатюры — готовые светлые SVG в `src/assets/wizard-thumbnails/{ru,en}` по файлу на локаль. Галерея их не рендерит при открытии.
6. Шаги «режим → язык → тип» и шаги ручного задания параметров («направление → параметры») убраны. Язык и тип приходят из примера галереи.
7. Короткий тап и клик открывают выбор из двух действий («В редактор», «Спросить модель»). Карточка с описанием — по долгому нажатию (на десктопе — по наведению или кнопке «Подробнее»).
8. Промпт модели свой у каждого примера, на `ru` и `en`.
9. Подписи тегов на языке интерфейса (`llm.wizard.gallery.tag.<axis>.<id>`).
10. Поиск по локализованному названию рядом с облаком тегов сужает уже отфильтрованный тегами список.

### Целевой сценарий мастера

1. Открытие мастера показывает поле поиска, облако тегов и сетку миниатюр всех текущих примеров.
2. Клик по тегу добавляет его в фильтр. Остаются миниатюры, у которых есть все выбранные теги и чьё название содержит строку поиска.
3. Клик или короткий тап по миниатюре открывает выбор из двух действий:
   - **«В редактор» (`editor`)** — кладёт исходник примера (`getSampleSource`) в редактор и закрывает мастер.
   - **«Спросить модель» (`llm`)** — открывает шаг описания/планирования (`context`) с предзаполненным промптом примера (`sendWizardPlanningChat`), затем шаг результата (`result`) с генерацией и чатом доработки.
4. Долгое нажатие (или наведение на десктопе) открывает карточку примера: язык, название, области применения, остальные теги, описание и те же две кнопки действий.

---

## Раздел 2. Поэтапный план полноценного рефакторинга проекта

### Этап 1. Декомпозиция `llm-wizard.ts`, удаление задания параметров из мастера и очистка `useDiagramWizardFlow.ts` (ВЫПОЛНЕНО ✅)

- Синхронизированы и вынесены генераторы каркасов диаграмм из `src/constants/llm-wizard.ts` в `src/services/llm/wizard/`:
  - `scaffold-shared.ts` — общие хелперы локализованных подписей и структурных блоков;
  - `scaffold-plantuml.ts` — все 15 типов PlantUML;
  - `scaffold-mermaid.ts` — все 18 типов Mermaid и GraphML;
  - `manual-scaffold.ts` — единая точка входа `buildManualScaffold` (используется для генерации образцов `wizard-sample-sources.ts` и тестов).
- Вынесены функции формирования LLM-промптов:
  - `src/services/llm/wizard/wizard-prompts.ts` (`buildWizardPrompt`);
  - `src/services/llm/wizard/edit-prompts.ts` (`buildPatchPrompt`, `buildFullDiagramEditPrompt` и промпты ретраев).
- Файл `src/constants/llm-wizard.ts` сокращён с **2 300 до 485 строк** (оставлены декларативные константы, типы и чистые предикаты).
- Убраны кнопки «Задать параметры» (`params` в `GALLERY_EXAMPLE_ACTIONS`) и весь UI-код задания параметров из мастера:
  - Удалены компоненты `WizardParamsStep.vue`, `WizardDirectionStep.vue`, `WizardPromptStep.vue`;
  - Очищены `WizardStepContent.vue`, `WizardModalFooter.vue`, `DiagramWizardModal.vue`;
  - Декомпозирован `useDiagramWizardFlow.ts` (выделены `useWizardAiChat.ts` и `useWizardStepPreview.ts`, убрана логика ручного шага параметров, переключения направления и `transferToEditor`).

### Этап 2. Реорганизация `src/utils/` и устранение циклических зависимостей в `src/languages/` (Критично)

1. **Единый сервис работы с файлами и форматами диаграмм**:
   - Объединить дублирующиеся функции из `src/utils/puml-files.ts` и `src/utils/diagram-files.ts` на базе `@shared/puml-files` и `src/languages/registry.ts`.
2. **Структурирование языковых утилит (Highlight / Autocomplete / Folding)**:
   - Выделить общий сканер строковых комментариев и скобочных блоков PlantUML в `src/languages/plantuml/block-scanner.ts` (устранив дублирование между `plantuml-autocomplete.ts` и `auto-fold-regions.ts`).
   - Сгруппировать подсветку синтаксиса (`*-highlight.ts`), автодополнение (`*-autocomplete.ts`) и сворачивание кода (`code-folds.ts`, `auto-fold-regions.ts`) в профильные подпапки `src/services/editor/`.
3. **Разрыв циклической зависимости в `src/languages/registry.ts`**:
   - Передавать ключевые слова в `withKeywordCompletions` напрямую при создании `FormatHandler` в модулях языков, убрав динамический `Object.defineProperty` геттер в `registry.ts`.
4. **Декомпозиция `src/utils/export.ts` (536 строк)**:
   - Разделить на `svg-background.ts`, `svg-geometry.ts` и `file-download.ts`.

### Этап 3. Декомпозиция движков рендеринга, конвертера и языковых справочников (Высокий приоритет)

1. **Декомпозиция `src/services/mermaid/ext/engines/waterfall.ts` (1 724 строки)**:
   - Разбить на модули: `types.ts`, `parser.ts`, `scale.ts`, `colors.ts`, `renderer.ts`, `index.ts`.
2. **Декомпозиция языковых справочников и каталогов примеров**:
   - Разбить `src/languages/primer.ts` (1 510 строк) на модули по языкам `src/languages/primers/{plantuml,mermaid,graphml,wiremark,d2,structurizr}.ts`.
   - Унифицировать справочник WireMark (`src/languages/wiremark-reference.ts`) со структурой `LanguagePrimer`.
   - Разбить крупные каталоги примеров `plantuml-sample-diagrams.ts` (1 030 строк) и `mermaid-sample-diagrams.ts` (945 строк) по семействам диаграмм.
3. **Декомпозиция пайплайна конвертации (`src/services/conversion/`)**:
   - Разбить `kind-parsers.ts` (1 263 строки) на `plantuml-kind-parsers.ts` и `mermaid-kind-parsers.ts`.
   - Разбить `emit-kind-diagrams.ts` (979 строк), `parse-plantuml.ts` (981 строка) и `parse-mermaid.ts` (906 строк) по семействам диаграмм.
4. **Декомпозиция `structurizr` и `graphml` + шаринг с `packages/mcp`**:
   - Разбить `src/services/structurizr/parse-dsl.ts` (1 085 строк) на `lexer.ts`, `ast.ts`, `parser.ts`.
   - Разбить `src/services/graphml/graphml-engine.ts` (912 строк) на `parse-graphml.ts`, `layout-graphml.ts`, `render-graphml-svg.ts` и переиспользовать рендерер в `packages/mcp`.

### Этап 4. Рефакторинг Vue-компонентов и Composables (Средний/Высокий приоритет)

1. **Структурирование `useAppShell.ts` и `App.vue`**:
   - Сгруппировать `AppShellContext` по доменам (`document`, `settings`, `render`, `history`, `modals`, `actions`) и сократить prop-drilling в `App.vue`.
2. **Упрощение `useLibraryModalFlow.ts` (766 строк)**:
   - Сгруппировать возвращаемое состояние по доменным контроллерам (`browse`, `edit`, `sectionAdmin`, `transfer`, `upload`, `share`, `preview`, `subscriptions`) и убрать мутабельные колбэк-рефы.
3. **Декомпозиция крупных Vue-компонентов (>500 строк)**:
   - `LibraryTransferTab.vue` (687 строк): использовать `buildSectionTree` + `flattenSections` из `@shared/section-tree` и выделить переиспользуемый `LibraryTransferCheckList.vue`.
   - `SnippetsPanel.vue` (663 строки): вынести перетаскивание в `useDraggableFloatingPanel.ts` и карточку в `SnippetCard.vue`.
   - Декомпозировать `LibrarySubscriptionsPanel.vue`, `EditorFoldRegionsModal.vue`, `AppearanceModal.vue`, `DiagramToolbar.vue`.

### Этап 5. Архитектура стилей и аудит CSS (`src/styles/app.css` — 1 799 строк)

- Разделить `src/styles/app.css` на тематические модули: `tokens.css`, `base.css`, `shell-layout.css`, `preview.css`, `site.css`.
- Удалить неиспользуемые CSS-селекторы старых версий лендинга (~550+ строк).

### Этап 6. Рефакторинг Backend (`server/`) и синхронизация контрактов

- Вынести SQL-миграции из `server/src/db.ts` в версионированный список миграций `server/src/migrations/` с использованием `schema_version`.
- Привести `server/src/subscriptions.ts` и `server/src/routes/subscriptions.ts` к слоистой архитектуре (`routes` → `services` → `schemas` с Zod-валидацией).
- Вынести строковые константы ошибок и настроить алиас `@shared/*` в `server/tsconfig.json`.
