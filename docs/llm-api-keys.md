# Инструкция: API-ключи для LLM (BYOK)

Источник для `public/llm-api-keys.html` (рус.) и `public/llm-api-keys.en.html` (англ.).
Обновляйте все три файла синхронно.

## Code2Graph — Bring Your Own Key

Ключ нужен только для провайдеров **«свой ключ»** в Настройки → AI.  
Бесплатные провайдеры **без ключа** используют сервер приложения (`POST /api/llm/chat`).

### Google Gemini (`google-gemini`)

1. Войдите в [Google AI Studio](https://aistudio.google.com/).
2. Создайте ключ: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. Free tier: лимиты на запросы в сутки (см. актуальную документацию Google).
4. В Code2Graph: **Настройки → AI → Google Gemini (свой ключ)** → вставьте ключ → Сохранить.

### Groq (`groq`)

1. Регистрация: [console.groq.com](https://console.groq.com/).
2. Ключ: [console.groq.com/keys](https://console.groq.com/keys).
3. Free tier с лимитами RPM.
4. Настройки → AI → Groq (свой ключ).

### OpenRouter (`openrouter`)

1. [openrouter.ai](https://openrouter.ai/) → аккаунт.
2. Ключ: [openrouter.ai/keys](https://openrouter.ai/keys).
3. Доступны free-модели с суффиксом `:free`.
4. Настройки → AI → OpenRouter (свой ключ).

### Mistral (`mistral`)

1. [console.mistral.ai](https://console.mistral.ai/).
2. Ключ: [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys).
3. Настройки → AI → Mistral (свой ключ).

### Безопасность ключей, паролей и токенов

Code2Graph не отправляет секреты на сторонние серверы приложения. Всё хранится
только локально в браузере (`localStorage`):

- **API-ключи LLM** (Настройки → AI)
- **Логин и пароль** сервера библиотеки (Настройки → Библиотека)
- **Токен авторизации** библиотеки после входа

Рекомендации:

- Не коммитьте ключи, пароли и токены в git.
- Не вставляйте секреты в чаты, issue и share-URL диаграммы.
- На общем компьютере удаляйте учётные данные в настройках после работы.

---

## English (`llm-api-keys.en.html`)

Полная английская версия — отдельный файл `public/llm-api-keys.en.html`.
Ссылка «English version» / «Русская версия» внизу каждой страницы.
