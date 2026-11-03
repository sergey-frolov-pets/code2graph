# Деплой Code2Graph

Один и тот же фронтенд собирается в двух режимах. Переключение — только переменная `VITE_API_BASE_URL`, код не меняется.

| Режим | `VITE_API_BASE_URL` | Что получает пользователь |
|-------|---------------------|--------------------------|
| Статический сайт (GitHub Pages) | пусто (`.env.production`) | Редактор, PWA, библиотека в браузере. Без сервера и БД |
| Сервер (VPS, nginx + SQLite) | `same-origin` или `https://хост` | Тот же сайт плюс облачная библиотека, вход и API |

`same-origin` означает запросы на `/api` того же хоста. Абсолютный URL указывает на отдельный Library API.

Локально сервер уже включён в `.env.development`. Своё значение кладите в `.env.local` или `.env.production.local` (они в `.gitignore`).

## Канонический таргет: GitHub Pages

Основной публичный сайт — [code2graph.ru](https://code2graph.ru), деплоится из ветки `main` через workflow `.github/workflows/deploy-pages.yml`.

| Параметр | Значение |
|----------|----------|
| Команда сборки | `npm run build` |
| `VITE_API_BASE_URL` | пусто |
| Артефакт | `dist/` (single-file `index.html` + PWA) |
| База данных | нет |
| PWA | Да (manifest, service worker, icons) |
| Домен | `public/CNAME` → custom domain |

CI перед деплоем выполняет:

- `npm run version:bump` — patch-версия в `package.json` (коммитится в `main` после успешного деплоя с `[skip ci]`)
- `npm run typecheck` — проверка TypeScript фронтенда
- `npm run test` — unit-тесты (Vitest)
- `npm run check:i18n` — паритет ключей RU/EN
- `npm --prefix server run typecheck` — проверка TypeScript API-сервера

## Серверная сборка

На VPS `scripts/deploy/vdsina-install.sh` и `vdsina-update.sh` перед `npm run build` читают `VITE_API_BASE_URL` из окружения, затем из `server/.env`, затем из корневого `.env`. Если ключа нет, подставляется `same-origin`, чтобы сайт с nginx по-прежнему ходил в `/api`.

Пример для `/opt/code2graph/server/.env`:

```bash
VITE_API_BASE_URL=same-origin
```

Пустое значение в этом файле собирает на VPS статику без API. SQLite по-прежнему задаётся через `DB_PATH` и нужен только процессу Node.

Локальная серверная сборка:

```bash
VITE_API_BASE_URL=same-origin npm run build
```

## Локальная разработка

```bash
npm ci
npm run dev          # фронтенд :5173, API через .env.development
npm run dev:api      # library API :3001
```

## Релизы

GitHub Release прикрепляет `code2graph.html` (см. `npm run package:release`).
