# Деплой vuePlantUML

## Канонический таргет: GitHub Pages

Основной публичный сайт — [puml.sergey-frolov.ru](https://puml.sergey-frolov.ru/), деплоится из ветки `main` через workflow `.github/workflows/deploy-pages.yml`.

| Параметр | Значение |
|----------|----------|
| Команда сборки | `npm run build` |
| Артефакт | `dist/` (single-file `index.html` + PWA) |
| PWA | Да (manifest, service worker, icons) |
| Домен | `public/CNAME` → custom domain |

CI перед деплоем выполняет:

- `npm run version:bump` — patch-версия в `package.json` (коммитится в `main` после успешного деплоя с `[skip ci]`)
- `npm run typecheck` — проверка TypeScript фронтенда
- `npm run test` — unit-тесты (Vitest)
- `npm run check:i18n` — паритет ключей RU/EN
- `npm --prefix server run typecheck` — проверка TypeScript API-сервера

## Альтернативный таргет: Netlify

`netlify.toml` настроен на **legacy**-сборку без PWA:

| Параметр | Значение |
|----------|----------|
| Команда сборки | `npm run build:single` |
| Артефакт | `dist-single/index.html` |
| PWA | Нет |

Используйте Netlify только если нужен минимальный одиночный HTML без service worker. Для основного продакшена предпочтителен GitHub Pages.

## Локальная разработка

```bash
npm ci
npm run dev          # фронтенд :5173
npm run dev:api      # library API :3001
```

## Релизы

GitHub Release прикрепляет `vueplantuml.html` (см. `npm run package:release`).
