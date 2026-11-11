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
}

export interface LlmChatOptions {
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmChatResult {
  content: string;
  providerId: string;
  model: string;
}

export class LlmClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LlmClientError";
    this.code = code;
  }
}
