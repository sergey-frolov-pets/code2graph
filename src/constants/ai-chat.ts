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

/** Вставка длиннее сообщения не попадает в поле: она становится текстовым файлом. */
export const AI_CHAT_PASTED_TEXT_BASENAME = "pasted";
export const AI_CHAT_PASTED_TEXT_EXTENSION = ".txt";

/** Сколько строк подсказки видно в списке «Что дальше» до открытия полного текста. */
export const AI_CHAT_SUGGESTION_VISIBLE_LINES = 2;

/** Пустое поле — одна строка. Дальше оно растёт от текста, не от плейсхолдера. */
export const AI_CHAT_COMPOSER_ROWS = 1;

/** К какой диаграмме относится следующий запрос: к открытой или к новой. */
export const AI_CHAT_CONTEXT_MODES = ["current", "new"] as const;
export type AiChatContextMode = (typeof AI_CHAT_CONTEXT_MODES)[number];
export const AI_CHAT_CONTEXT_MODE_DEFAULT: AiChatContextMode = "current";
export const AI_CHAT_CONTEXT_MODE_STORAGE_KEY = "code2graph-ai-chat-context-mode";

export const AI_CHAT_ATTACHMENT_KINDS = ["diagram", "text", "pdf", "spreadsheet", "image"] as const;
export type AiChatAttachmentKind = (typeof AI_CHAT_ATTACHMENT_KINDS)[number];

/** Сколько файлов можно прикрепить к одному сообщению. */
export const AI_CHAT_MAX_ATTACHMENTS = 4;

/** Картинки уходят в модель отдельно и не пишутся в историю. */
export const AI_CHAT_MAX_IMAGE_ATTACHMENTS = 2;

export const AI_CHAT_ATTACHMENT_FILE_MAX_BYTES = 1_500_000;
export const BYTES_PER_MEGABYTE = 1_000_000;
export const AI_CHAT_ATTACHMENT_NAME_MAX_CHARS = 120;
export const AI_CHAT_ATTACHMENT_EXCERPT_MAX_CHARS = 4_000;
export const AI_CHAT_ATTACHMENT_EMPTY_TEXT = "(no extractable text)";

export const AI_CHAT_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const AI_CHAT_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;
export const AI_CHAT_TEXT_EXTENSIONS = [
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".log",
  ".yaml",
  ".yml",
  ".txt",
  ".svg",
] as const;
export const AI_CHAT_MARKDOWN_EXTENSIONS = [".md", ".markdown"] as const;
export const AI_CHAT_SPREADSHEET_EXTENSIONS = [".xlsx"] as const;
export const AI_CHAT_SPREADSHEET_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const AI_CHAT_XLSX_MAX_SHEETS = 8;
export const AI_CHAT_XLSX_MAX_ROWS = 200;
export const AI_CHAT_XLSX_MAX_COLUMNS = 40;

/** Длина фрагмента транскрипта для эвристической проверки на секреты перед шарингом. */
export const AI_CHAT_SECRET_SCAN_MIN_TOKEN_LENGTH = 24;

export const AI_CHAT_APPLY_MODE_STORAGE_KEY = "code2graph-ai-chat-apply-mode";
