# vuePlantUML

Кросс-платформенный оффлайн генератор PlantUML диаграмм на Vue 3 + `@plantuml/core` (Smetana).

**Сайт:** [puml.sergey-frolov.ru](https://puml.sergey-frolov.ru/)

Репозиторий: [github.com/sergey-frolov-pets/vuePUML](https://github.com/sergey-frolov-pets/vuePUML)

## Скачать

[Releases](https://github.com/sergey-frolov-pets/vuePUML/releases/latest) → **`vueplantuml.html`**

Локальная сборка релиз-пакета (HTML + companion files):

```bash
npm run build:release
```

Результат в `release/`:

| Файл | Назначение |
|------|------------|
| `vueplantuml.html` | Приложение (один HTML) |
| `llm-api-keys.html` | Инструкция по API-ключам BYOK |
| `plantuml-lib/` | C4 stdlib для `!include` |
| `README.md` | Этот файл (краткая справка) |

Для `file://` держите **все файлы в одной папке**.

Альтернатива: `publish/index.html` в репозитории или `dist-single/index.html` после `npm run build:single`.

## Разработка

```bash
npm ci
npm run dev
```

С API-сервером (библиотека + free LLM):

```bash
npm run dev:all
```

Сборка для GitHub Pages / хостинга:

```bash
npm run build:single
```

Результат: `dist-single/index.html` + `llm-api-keys.html` + `plantuml-lib/`

## AI / LLM — генерация и редактирование диаграмм

Приложение поддерживает облачные LLM для:

- **Мастер новой диаграммы** (кнопка AI в шапке)
- **Изменение выделения** (кнопка «Изменить с AI» в редакторе)

### Free (без ключа пользователя)

- Default провайдер: **Google Gemini 2.0 Flash** (`google-gemini-free`)
- Запросы идут через **сервер приложения** `POST /api/llm/chat`
- Нужен consent в **Настройки → AI / LLM**
- На hosted-сайте с API или при указанном адресе сервера библиотеки

### BYOK (свой ключ)

- Провайдеры: Gemini, Groq, OpenRouter, Mistral
- Ключ только в `localStorage` браузера
- Инструкция: **Настройки → Как получить API-ключ LLM** или `llm-api-keys.html`

### Сервер LLM (self-hosted)

См. [server/README.md](server/README.md).

Минимум:

```bash
export GEMINI_API_KEY="..."   # https://aistudio.google.com/apikey
cd server && npm run dev
```

В приложении: **Настройки → Библиотека** → `http://localhost:3001`

### Валидация

Ответ LLM проверяется (JSON → PlantUML static → engine) до применения в редактор. Undo доступен после AI-изменений.

## Деплой на GitHub Pages

Сайт публикуется автоматически при пуше в `main` (workflow `.github/workflows/deploy-pages.yml`).

### Настройка домена `puml.sergey-frolov.ru`

1. В репозитории: **Settings → Pages → Custom domain** → `puml.sergey-frolov.ru`
2. У DNS-провайдера добавьте записи:
   - `CNAME` `puml` → `sergey-frolov-pets.github.io`
   - или `A`/`AAAA` на IP GitHub Pages (см. [документацию](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site))
3. Включите **Enforce HTTPS**

Файл `public/CNAME` уже содержит домен и копируется в `dist/` при сборке.

## Возможности

- Live-предпросмотр SVG
- Экспорт SVG и PNG
- Оффлайн (`file://`, PWA)
- Smetana / ELK / dot layout
- Тёмная тема, настройки редактора
- Библиотека диаграмм (локально / REST API)
- AI: wizard + patch выделения (LLM)

## Лицензия

MIT — см. [LICENSE](LICENSE).
