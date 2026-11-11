import {
  LLM_CHAT_COMPLETIONS_PATH,
  LLM_LOCAL_URL_MAX_LENGTH,
  LLM_OPENAI_V1_PATH,
} from "@/constants/llm-account";

const HTTP_PROTOCOL = "http:";
const HTTPS_PROTOCOL = "https:";

/**
 * Приводит базовый адрес локального сервера к URL chat completions.
 * Принимает корень (`http://127.0.0.1:11434`), `/v1` или уже полный путь.
 */
export function resolveOpenAiChatEndpoint(baseUrl: string): string | null {
  const trimmed = baseUrl.trim();
  if (!trimmed || trimmed.length > LLM_LOCAL_URL_MAX_LENGTH) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== HTTP_PROTOCOL && url.protocol !== HTTPS_PROTOCOL) {
    return null;
  }

  if (!url.hostname) {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith(LLM_CHAT_COMPLETIONS_PATH)) {
    url.pathname = path || LLM_CHAT_COMPLETIONS_PATH;
  } else if (path.endsWith(LLM_OPENAI_V1_PATH)) {
    url.pathname = `${path}${LLM_CHAT_COMPLETIONS_PATH}`;
  } else {
    url.pathname = `${path}${LLM_OPENAI_V1_PATH}${LLM_CHAT_COMPLETIONS_PATH}`;
  }

  return url.toString();
}
