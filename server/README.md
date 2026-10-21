# Code2Graph Library API + LLM proxy

Опциональный сервер для:

- REST API библиотеки диаграмм (`/api/sections`, `/api/diagrams`)
- **Free LLM proxy** (`POST /api/llm/chat`) — без ключа пользователя

## Запуск

```bash
cd server
npm ci
npm run dev
```

По умолчанию: `http://localhost:3001`

Во frontend dev-режиме Vite проксирует `/api` на этот порт.

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт HTTP | `3001` |
| `DB_PATH` | Путь к SQLite | `data/library.db` |
| `MAX_PUML_FILE_BYTES` | Лимит размера `.puml` | `512000` |
| `GEMINI_API_KEY` | Ключ Google AI для `google-gemini-free` | — |
| `GROQ_API_KEY` | Ключ Groq для `groq-free` | — |
| `OPENROUTER_API_KEY` | Ключ OpenRouter для `openrouter-free` | — |
| `LLM_RATE_LIMIT_PER_MINUTE` | Лимит запросов LLM на IP | `20` |
| `AUTH_TOKEN_SECRET` | Секрет для Bearer-токенов API | dev-значение (задайте в продакшене) |
| `VITE_API_BASE_URL` | Адрес API для **сборки фронтенда** (не читается Node) | на VPS, если ключ отсутствует: `same-origin` |

`VITE_API_BASE_URL` связывает статическую и серверную версии без правок кода:

- пусто — GitHub Pages и любая статика: библиотека только в браузере, без SQLite;
- `same-origin` — фронтенд вызывает `/api` на том же хосте;
- `https://хост` — фронтенд вызывает указанный сервер.

На VPS значение забирает `scripts/deploy/frontend-env.sh` из `server/.env` перед `npm run build`.

Первый администратор создаётся через приложение при открытии библиотеки (`POST /api/auth/setup`), если в SQLite ещё нет пользователей. Публичный статус: `GET /api/auth/status`.

Все `/api/*` endpoints (кроме `/api/auth/status` и `/api/auth/setup` при пустой БД) требуют `Authorization: Bearer …` или `Basic …`.


Подробная инструкция развёртывания на VPS: `docs/LIBRARY_DEPLOY.md`.

Минимум для free Gemini (рекомендованный default в приложении):

```bash
export GEMINI_API_KEY="your-key-from-https://aistudio.google.com/apikey"
npm run dev
```

## LLM endpoints

### `GET /api/llm/status`

Статус free-провайдеров (`configured: true/false`).

### `POST /api/llm/chat`

Body:

```json
{
  "providerId": "google-gemini-free",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "jsonMode": true
}
```

Разрешены только id: `google-gemini-free`, `groq-free`, `openrouter-free`.

## Agent API

Публичные маршруты для MCP (`packages/mcp`). Библиотечный логин не нужен.

Если задан `AGENT_API_TOKEN`, запросы ждут `Authorization: Bearer <token>`. Без переменной маршруты открыты.

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET` | `/api/agent/formats` | Языки сайта и типы диаграмм |
| `POST` | `/api/agent/diagrams/plan` | Выбор языка и типа по тексту |
| `POST` | `/api/agent/diagrams/scaffold` | Исходник шаблона для выбранного языка |

Тело plan и scaffold: `{ "request": "...", "format?": "d2", "diagramType?": "sequence", "locale?": "ru", "direction?": "LR" }`.

Инструмент MCP `generate_diagram` к этому исходнику добавляет изображение: PNG для PlantUML, D2, Structurizr, GraphML и WireMark, JPEG для Mermaid. HTTP-ответ scaffold по-прежнему содержит только исходник; картинку собирает процесс MCP.

## Настройка в приложении

**Настройки → Библиотека → Адрес сервера:** `http://localhost:3001` (или ваш хост).

**Настройки → Библиотека → Логин и пароль:** учётные данные Basic Auth (если заданы на сервере).

**Настройки → AI / LLM:** провайдер `Google Gemini (без ключа)` + consent.

Ключи BYOK пользователя **не** отправляются на этот сервер — только free_builtin через proxy.
