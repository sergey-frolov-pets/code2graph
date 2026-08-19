# Code-to-Graph

Генерация PlantUML из исходного кода проекта (Python, JS, TS, HTML) через мастер **Из кода**.

**Где в интерфейсе:** кнопка **«Диаграмма из кода»** в шапке (иконка `{ }`) или **Новая диаграмма** → режим **Из кода**.

## Возможности

- Источники: zip (≤ 5 MB), локальная папка, GitHub (Pro, PAT как BYOK)
- Дерево: проект → файл → символ, multi-select
- Типы диаграмм: folder, class, package, flow/activity, dependency
- Оффлайн AST; онлайн GitHub + batch + hybrid LLM — Code2Graph Pro
- Free: folder и class, один файл
- Результат открывается в **новой вкладке** редактора

## Архитектура

```
ingest → CodeProjectIR → DiagramIR → emitPlantUml
```

Языки подключаются через `src/services/code-graph/languages/registry.ts`.

## API (server)

- `GET /api/code-graph/limits`
- `POST /api/code-graph/activate-pro`

SKU подписки: `code2graph-pro`
