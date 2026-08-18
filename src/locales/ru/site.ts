import type { LocaleMessages } from "../types";

export const siteMessages: LocaleMessages = {
  "site.nav.features": "Возможности",
  "site.nav.audience": "Для кого",
  "site.nav.how": "Как это работает",
  "site.nav.pricing": "Тарифы",
  "site.nav.faq": "FAQ",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "Оффлайн-редактор диаграмм: PlantUML, Mermaid и GraphML. AI-помощник, облачная библиотека, экспорт SVG/PNG.",
  "site.landingHeroAlt":
    "Code2Graph: код → диаграммы (Sequence, Flowchart, Graph) → облачное хранение → экспорт Mermaid, PlantUML, GraphML",
  "site.landingCtaApp": "Открыть редактор",
  "site.landingCtaRegister": "Регистрация",
  "site.landingCtaLogin": "Вход",
  "site.landingCtaTryFree": "Попробовать бесплатно",
  "site.landingCtaDemo": "Демо",

  "site.hero.title": "Превратите сложный код в наглядную интерактивную карту за пару секунд",
  "site.hero.subtitle":
    "Code2Graph мгновенно визуализирует архитектуру вашего проекта, связи между модулями и вызовы функций. Понимайте Legacy-код без часовых раскопок, проводите безопасный рефакторинг и вводите новых разработчиков в проект за дни, а не недели.",
  "site.hero.ctaPrimary": "Попробовать бесплатно",
  "site.hero.ctaPrimaryNote": "Без привязки карты",
  "site.hero.ctaSecondary": "Посмотреть интерактивное демо",
  "site.hero.trustSecurity":
    "100% безопасность: ваш код обрабатывается локально или в вашем изолированном контуре.",
  "site.hero.trustLanguages": "Поддержка ключевых языков: Python, Java, JS/TS, C++, Go и др.",

  "site.pain.title": "Знакомые проблемы при работе с кодом?",
  "site.pain.colProblem": "Проблема",
  "site.pain.colCurrent": "Как это происходит сейчас",
  "site.pain.colSolution": "Что даёт Code2Graph",
  "site.pain.row1.problem": "Сложный онбординг",
  "site.pain.row1.current":
    "Новый разработчик недели тратит на чтение устаревшей документации и спагетти-кода.",
  "site.pain.row1.solution": "Граф архитектуры показывает всю систему как на ладони с первого дня.",
  "site.pain.row2.problem": "Страх рефакторинга",
  "site.pain.row2.current":
    "Менять старый модуль страшно: одно изменение тихо ломает 5 независимых сервисов.",
  "site.pain.row2.solution": "Impact-анализ показывает все зависимые узлы до внесения коммита.",
  "site.pain.row3.problem": "Устаревшая документация",
  "site.pain.row3.current":
    "Архитектурные схемы в Confluence/Miro устаревают на следующий день после создания.",
  "site.pain.row3.solution": "Автоматически обновляемая карта кода в реальном времени.",
  "site.pain.row4.problem": "Архитектурный хаос",
  "site.pain.row4.current":
    "Монолит разросся, циклические зависимости плодятся, технический долг растёт.",
  "site.pain.row4.solution": "Наглядное выявление «узких мест», дублирования и хаотичных связей.",

  "site.features.title": "Всё, что нужно для полного контроля над кодом",
  "site.features.item1.title": "Мгновенная визуализация зависимостей",
  "site.features.item1.what":
    "Строит интерактивный граф вызовов (Call Graph) и связей между модулями, классами и функциями.",
  "site.features.item1.benefit":
    "Вы видите реальную структуру приложения, а не то, что написано в устаревшей документации.",
  "site.features.item2.title": "Оценка влияния изменений (Impact Analysis)",
  "site.features.item2.what":
    "Подсвечивает все функции и компоненты, которые затронет ваше правка.",
  "site.features.item2.benefit":
    "Ноль сюрпризов в продакшене. Вы точно знаете, что проверяют тесты и что может сломаться.",
  "site.features.item3.title": "Безопасность уровня Enterprise",
  "site.features.item3.what":
    "Статический анализ выполняется без отправки исходного кода на сторонние серверы (On-Premise / CLI / Docker).",
  "site.features.item3.benefit":
    "Полное соответствие требованиям информационной безопасности и коммерческой тайны.",
  "site.features.item4.title": "Интеграция в CI/CD и Git-Workflow",
  "site.features.item4.what":
    "Генерирует актуальные схемы архитектуры при каждом Pull Request или релизе.",
  "site.features.item4.benefit": "Вся команда всегда работает с актуальным представлением системы.",
  "site.features.whatLabel": "Что делает",
  "site.features.benefitLabel": "Выгода",

  "site.audience.title": "Инструмент, который окупается с первого спринта",
  "site.audience.lead.title": "Team Lead / Техлидам",
  "site.audience.lead.item1": "Сокращайте время проведения Code Review.",
  "site.audience.lead.item2":
    "Быстро оценивайте трудоёмкость задач и риски архитектурных изменений.",
  "site.audience.architect.title": "Архитекторам ПО",
  "site.audience.architect.item1": "Контролируйте соблюдение архитектурных паттернов и гайдлайнов.",
  "site.audience.architect.item2": "Находите и устраняйте циклические зависимости и монолитные сцепления.",
  "site.audience.dev.title": "Разработчикам (Senior / Middle / Junior)",
  "site.audience.dev.item1": "Вникайте в незнакомые модули за минуты.",
  "site.audience.dev.item2": "Проводите рефакторинг уверенно и без лишнего стресса.",
  "site.audience.cto.title": "CTO и IT-Директорам",
  "site.audience.cto.item1":
    "Уменьшайте Bus Factor (зависимость от отдельных «уникальных» разработчиков).",
  "site.audience.cto.item2":
    "Ускоряйте Time-to-Market новых фич за счёт чистоты и понятности кода.",

  "site.how.title": "От репозитория к понятной карте — за 30 секунд",
  "site.how.step1.title": "Шаг 1: Подключите проект",
  "site.how.step1.text":
    "Загрузите архив, укажите ссылку на Git-репозиторий или запустите CLI-утилиту в вашем локальном окружении.",
  "site.how.step2.title": "Шаг 2: Запустите автоматический анализ",
  "site.how.step2.text":
    "Code2Graph мгновенно разберёт структуру кода, AST-деревья и выстроит карту связей.",
  "site.how.step3.title": "Шаг 3: Исследуйте и делитесь",
  "site.how.step3.text":
    "Фильтруйте узлы, ищите функции, анализируйте цепочки вызовов и экспортируйте схемы в интерактивные форматы.",

  "site.metrics.title": "Эффект от внедрения Code2Graph",
  "site.metrics.item1": "−60% времени на погружение нового разработчика в проект",
  "site.metrics.item2": "3× снижение количества багов, связанных с неожиданными зависимостями",
  "site.metrics.item3": "100% актуальность архитектурной документации в любой момент времени",

  "site.pricing.title": "Прозрачные тарифы под любые задачи",
  "site.pricing.popular": "Популярный",
  "site.pricing.starter.name": "Starter (Free)",
  "site.pricing.starter.desc": "Для личных проектов и ознакомления",
  "site.pricing.starter.feature1": "До 50 000 строк кода на проект",
  "site.pricing.starter.feature2": "Основные языки программирования",
  "site.pricing.starter.feature3": "Базовая визуализация графа",
  "site.pricing.starter.price": "0 ₽ / навсегда",
  "site.pricing.starter.cta": "Начать бесплатно",
  "site.pricing.team.name": "Team",
  "site.pricing.team.desc": "Для продуктовых команд и растущих IT-компаний",
  "site.pricing.team.feature1": "Без ограничений по размеру кода",
  "site.pricing.team.feature2": "Полный Impact-анализ и поиск узких мест",
  "site.pricing.team.feature3": "Интеграция с GitHub / GitLab CI/CD",
  "site.pricing.team.feature4": "Экспорт в SVG / PNG / JSON",
  "site.pricing.team.price": "Скоро — цена будет объявлена",
  "site.pricing.team.cta": "Попробовать 14 дней бесплатно",
  "site.pricing.enterprise.name": "Enterprise / On-Premise",
  "site.pricing.enterprise.desc": "Для крупных корпораций с повышенными требованиями к ИБ",
  "site.pricing.enterprise.feature1": "Развёртывание в закрытом контуре (Self-Hosted / Docker / K8s)",
  "site.pricing.enterprise.feature2": "Интеграция с SSO / Active Directory",
  "site.pricing.enterprise.feature3": "Персональный менеджер и SLA поддержки",
  "site.pricing.enterprise.feature4": "Доработка парсеров под ваши внутренние фреймворки",
  "site.pricing.enterprise.price": "По запросу",
  "site.pricing.enterprise.cta": "Связаться с нами",

  "site.faq.title": "Часто задаваемые вопросы",
  "site.faq.q1": "Безопасно ли передавать вам наш исходный код?",
  "site.faq.a1":
    "Да! Безопасность — наш главный приоритет. Вы можете использовать локальную CLI-версию или On-Premise дистрибутив. В этом случае код не покидает периметр вашей компании.",
  "site.faq.q2": "Какие языки программирования поддерживаются?",
  "site.faq.a2":
    "На данный момент поддерживаются Python, JavaScript, TypeScript, Java, C++, Go (список постоянно пополняется).",
  "site.faq.q3": "Чем Code2Graph отличается от обычных IDE-генераторов диаграмм?",
  "site.faq.a3":
    "Стандартные инструменты IDE создают громоздкие, нечитаемые «паутины». Code2Graph группирует элементы по уровням абстракции, позволяет интерактивно скрывать лишнее и выполняет глубокий семантический Impact-анализ.",
  "site.faq.q4": "Можно ли интегрировать сервис в наш CI/CD?",
  "site.faq.a4":
    "Да, у нас есть готовые плагины для GitHub Actions, GitLab CI и командной строки (CLI).",

  "site.finalCta.title": "Перестаньте гадать, как работает ваш код",
  "site.finalCta.text":
    "Попробуйте Code2Graph прямо сейчас на своём проекте и убедитесь, насколько проще может быть работа со сложной архитектурой.",
  "site.finalCta.button": "Попробовать Code2Graph бесплатно",

  "site.featureOffline": "Работает офлайн и с file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "AI: генерация и правка диаграмм",
  "site.featureLibrary": "Облачная библиотека диаграмм",
  "site.featureLlmLocal": "BYOK-ключи LLM только в браузере",
  "site.loginTitle": "Вход",
  "site.loginSubtitle": "Личный кабинет и облачная библиотека",
  "site.registerTitle": "Регистрация",
  "site.registerSubtitle": "Создайте аккаунт на сервере Code2Graph",
  "site.accountTitle": "Личный кабинет",
  "site.username": "Логин",
  "site.password": "Пароль",
  "site.passwordConfirm": "Пароль ещё раз",
  "site.rememberMe": "Запомнить меня",
  "site.loginSubmit": "Войти",
  "site.registerSubmit": "Зарегистрироваться",
  "site.logout": "Выйти",
  "site.openEditor": "Открыть редактор",
  "site.backHome": "На главную",
  "site.noAccount": "Нет аккаунта?",
  "site.hasAccount": "Уже есть аккаунт?",
  "site.role": "Роль",
  "site.loginError": "Неверный логин или пароль",
  "site.registerError": "Не удалось зарегистрироваться",
  "site.registerDisabled": "Регистрация отключена администратором",
  "site.registerStatusError":
    "Не удалось проверить статус сервера. Проверьте подключение и попробуйте снова.",
  "site.registerMismatch": "Пароли не совпадают",
  "site.registerRequired": "Заполните все поля",
  "site.welcomeUser": "Вы вошли как {username}",
};
