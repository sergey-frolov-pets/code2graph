# vuePlantUML — релиз-пакет

Кросс-платформенный оффлайн генератор PlantUML на Vue 3 + `@plantuml/core`.

## Файлы в пакете

| Файл | Описание |
|------|----------|
| `vueplantuml.html` | Приложение (открыть в браузере) |
| `llm-api-keys.html` | Как получить API-ключи для BYOK-провайдеров |
| `plantuml-lib/` | C4 PlantUML stdlib (`!include`) |

**Важно:** для `file://` все файлы должны быть в **одной папке**.

## AI / LLM

### Без ключа (free)

1. Настройки → AI / LLM → consent
2. Провайдер: **Google Gemini (без ключа)** (рекомендован)
3. Нужен сервер с API — на сайте разработчика или свой:

```bash
export GEMINI_API_KEY="..."   # https://aistudio.google.com/apikey
cd server && npm ci && npm run dev
```

Настройки → Библиотека → `http://localhost:3001`

### Свой ключ (BYOK)

1. Откройте `llm-api-keys.html`
2. Настройки → AI / LLM → выберите провайдер «(свой ключ)» → вставьте ключ

## Разработка

```bash
npm ci
npm run dev
npm run build:release   # собрать release/
```

Подробности: [README.md](https://github.com/sergey-frolov-pets/vuePUML) в репозитории.

## Лицензия

MIT
