# vuePlantUML

Кросс-платформенный оффлайн генератор PlantUML диаграмм на Vue 3 + `@plantuml/core` (Smetana).

**Сайт:** [puml.sergey-frolov.ru](https://puml.sergey-frolov.ru/)

Репозиторий: [github.com/sergey-frolov-pets/vuePUML](https://github.com/sergey-frolov-pets/vuePUML)

## Скачать

[Releases](https://github.com/sergey-frolov-pets/vuePUML/releases/latest) → **`vueplantuml.html`**

Или файл `publish/index.html` из репозитория.

## Разработка

```bash
npm ci
npm run dev
```

Сборка одного HTML-файла:

```bash
npm run build:single
```

Результат: `dist-single/index.html`

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

## Лицензия

MIT — см. [LICENSE](LICENSE).
