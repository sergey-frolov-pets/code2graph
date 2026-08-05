# Инструкция: API-ключи для LLM (BYOK)

Источник для `public/llm-api-keys.html`. Обновляйте оба файла синхронно.

## vuePlantUML — Bring Your Own Key

Ключ нужен только для провайдеров **«свой ключ»** в Настройки → AI.  
Бесплатные провайдеры **без ключа** используют сервер приложения (`POST /api/llm/chat`).

### Google Gemini (`google-gemini`)

1. Войдите в [Google AI Studio](https://aistudio.google.com/).
2. Создайте ключ: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. Free tier: лимиты на запросы в сутки (см. актуальную документацию Google).
4. В vuePlantUML: **Настройки → AI → Google Gemini (свой ключ)** → вставьте ключ → Сохранить.

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

### Безопасность

- Не коммитьте ключи в git.
- Не вставляйте ключи в чаты и issue.
- Ключ хранится только в `localStorage` вашего браузера.

---

## English

### Google Gemini

1. Sign in at [Google AI Studio](https://aistudio.google.com/).
2. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. Paste in **Settings → AI → Google Gemini (your key)**.

### Groq / OpenRouter / Mistral

Same flow: provider console → API keys → paste in vuePlantUML Settings → AI.

Do not commit or share your API keys.
