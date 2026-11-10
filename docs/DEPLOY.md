# Деплой Code2Graph

Один и тот же фронтенд работает в двух режимах. Код не переключается: режим берётся из конфигурации.

| Режим | Как включается | Что получает пользователь |
|-------|----------------|---------------------------|
| Статический сайт | нет `deployment.json` с адресом API, пустой `VITE_API_BASE_URL`, нет ручного URL в настройках | Редактор, PWA, библиотека в браузере. Запросов к `/api` нет |
| Сервер | `deployment.json` с `apiBaseUrl`, либо адрес в настройках, либо запасной `VITE_API_BASE_URL` | Тот же сайт плюс вход, облачная библиотека, подписки и прокси LLM |

Порядок адреса API: сохранённый пользователем URL, затем `deployment.json` рядом с сайтом, затем переменная сборки. На статическом сайте сохранённый адрес того же хоста игнорируется. Файл `file://` не читает `deployment.json`.

Пример файла:

```json
{
  "apiBaseUrl": "/api",
  "publicOrigin": "https://diagrams.example.com"
}
```

Пустой `apiBaseUrl` оставляет статику. `publicOrigin` задаёт публичные ссылки и не требует правки исходников.

## Статика (GitHub Pages)

```bash
npm ci
npm run build
```

`VITE_API_BASE_URL` в `.env.production` пустой. В `public/deployment.json` адрес API тоже пустой. Артефакт — `dist/`.

## Docker

```bash
cp server/.env.example server/.env
# Задайте AUTH_TOKEN_SECRET (не короче 32 символов)
docker compose up -d --build
```

Контейнер отдаёт статику и API на порту 3001. `GET /deployment.json` возвращает `apiBaseUrl: /api`. Первый администратор создаётся в библиотеке приложения.

## VPS

`scripts/deploy/vdsina-install.sh` и `vdsina-update.sh` собирают фронтенд как статику и после копирования в корень сайта пишут `deployment.json` с `/api` (или `DEPLOYMENT_API_BASE_URL` из `server/.env`). Отдельная серверная пересборка фронта не нужна.

Переменные сервера: [server/.env.example](../server/.env.example) и [deploy/server.env.example](../deploy/server.env.example). `VITE_API_BASE_URL` сервер не читает.

Подробности VPS (DNS, nginx, сертификат): [DEPLOY_VDSINA.md](DEPLOY_VDSINA.md).

## Локальная разработка

```bash
npm ci
npm run dev          # фронтенд :5173, API через .env.development
npm run dev:api      # library API :3001
```

`.env.development` задаёт `VITE_API_BASE_URL=same-origin`. Статический превью без сервера: `.env.local` с пустым `VITE_API_BASE_URL`.
