/** Идентификатор встроенного провайдера «локальный OpenAI-совместимый сервер». */
export const LOCAL_LLM_PROVIDER_ID = "local";

/** Ollama по умолчанию отдаёт OpenAI-совместимый API на этом адресе. */
export const LOCAL_LLM_DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1";

export const LOCAL_LLM_DEFAULT_MODEL = "llama3.2";

export const LLM_API_KEY_MIN_LENGTH = 8;
export const LLM_API_KEY_MAX_LENGTH = 512;
export const LLM_ACCOUNT_LABEL_MAX_LENGTH = 80;
export const LLM_ACCOUNT_ID_MAX_LENGTH = 80;
export const LLM_LOCAL_URL_MAX_LENGTH = 300;
export const LLM_MODEL_NAME_MAX_LENGTH = 120;
export const LLM_API_KEY_MASK_EDGE = 4;

/** Префикс id в селекторе чата для бесплатных провайдеров без сохранённого ключа. */
export const FREE_LLM_SELECTION_PREFIX = "free:";

export const LEGACY_LLM_ACCOUNT_ID_PREFIX = "legacy-";

export const LLM_CHAT_COMPLETIONS_PATH = "/chat/completions";
export const LLM_OPENAI_V1_PATH = "/v1";

const LLM_MODEL_NAME_PATTERN = /^[\w./:@+-]+$/;

export function isValidLlmModelName(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= LLM_MODEL_NAME_MAX_LENGTH &&
    LLM_MODEL_NAME_PATTERN.test(trimmed)
  );
}
