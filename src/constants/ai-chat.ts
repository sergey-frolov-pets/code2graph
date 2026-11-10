/** Как ИИ-чат поступает с предложенной правкой диаграммы (выбор пользователя, Q1). */
export const AI_CHAT_APPLY_MODES = ["proposal", "immediate"] as const;
export type AiChatApplyMode = (typeof AI_CHAT_APPLY_MODES)[number];
export const AI_CHAT_DEFAULT_APPLY_MODE: AiChatApplyMode = "proposal";

/** Максимум сессий ИИ-чата на один документ редактора. */
export const AI_CHAT_MAX_SESSIONS_PER_DOCUMENT = 50;

/** После этого числа сообщений старая часть диалога сворачивается в summary. */
export const AI_CHAT_SUMMARY_TRIGGER_MESSAGES = 40;

/** Сколько последних сообщений всегда отправляется модели дословно. */
export const AI_CHAT_RECENT_MESSAGES = 20;

/** Максимум символов summary, который хранится в сессии. */
export const AI_CHAT_SUMMARY_MAX_CHARS = 2000;

/** Максимум символов исходника диаграммы в контексте запроса (остальное обрезается с пометкой). */
export const AI_CHAT_CONTEXT_SOURCE_MAX_CHARS = 12000;

/** Максимум уточняющих вопросов в одном ответе ИИ. */
export const AI_CHAT_MAX_CLARIFICATION_QUESTIONS = 3;

/** Максимум символов авто-заголовка сессии. */
export const AI_CHAT_TITLE_MAX_CHARS = 60;

/** Сколько раз повторяем запрос, если предложенный исходник не прошёл валидацию формата. */
export const AI_CHAT_VALIDATION_RETRIES = 2;

/** Максимум символов одного сообщения пользователя. */
export const AI_CHAT_MESSAGE_MAX_CHARS = 8000;

/** Длина фрагмента транскрипта для эвристической проверки на секреты перед шарингом. */
export const AI_CHAT_SECRET_SCAN_MIN_TOKEN_LENGTH = 24;

export const AI_CHAT_APPLY_MODE_STORAGE_KEY = "code2graph-ai-chat-apply-mode";
