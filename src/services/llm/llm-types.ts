import type { LlmAccessTarget } from "@/config/llm-account-record";

export type LlmChatRole = "system" | "user" | "assistant";

/** Картинка для одного запроса. В историю чата байты не сохраняются. */
export interface LlmChatImagePart {
  mimeType: string;
  dataBase64: string;
}

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
  images?: LlmChatImagePart[];
  /** Рассуждение прошлого хода Kimi. В пузырь чата не попадает. */
  reasoningContent?: string;
}

export interface LlmTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmChatOptions {
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Выбор из чата. Без него используется провайдер из настроек. */
  access?: LlmAccessTarget;
  signal?: AbortSignal;
  /** Первый видимый токен ответа, не рассуждение. */
  onOutputStart?: () => void;
}

export interface LlmChatResult {
  content: string;
  providerId: string;
  model: string;
  usage?: LlmTokenUsage;
  reasoningContent?: string;
}

export class LlmClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LlmClientError";
    this.code = code;
  }
}
